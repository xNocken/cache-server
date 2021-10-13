const fs = require('fs');
const { WebSocketServer } = require('ws');
const BinaryBuilder = require('./BinaryBuilder');
const BinaryReader = require('./BinaryReader');
const ReqestTypes = require('./enums/RequestTypes');
const StatusCodes = require('./enums/StatusCodes');
const wss = new WebSocketServer({
  port: 10000,
});

let config;

/**
 * @returns {Array}
 */
const getConfig = () => {
  if (!config) {
    config = JSON.parse(fs.readFileSync('cache/config.json'));
  }

  return config;
}

const saveConfig = () => {
  if (!config) {
    return;
  }

  fs.writeFileSync('cache/config.json', JSON.stringify(config));
}

const removeEntryByConfig = (config) => {
  const cacheConfig = getConfig();
  const cacheEntry = cacheConfig.findIndex(({ group, key }) => group === config.group && key === config.key)

  if (cacheEntry !== -1) {
    cacheConfig.splice(cacheEntry, 1);
    fs.unlinkSync(`cache/${config.group}/${config.key}`);

    if (!cacheConfig.find(({ group }) => group === config.group)) {
      fs.rmdirSync(`cache/${config.group}`);
    }
  }

  saveConfig();
}

const checkForExpiredCache = () => {
  const cacheConfig = getConfig();

  cacheConfig.filter(({ expiresAt }) => expiresAt < Date.now()).forEach(removeEntryByConfig);
}

const removeEntry = (message, ws, messageId) => {
  const config = message.readConfig();
  const cacheConfig = getConfig();
  const cacheEntry = cacheConfig.find(({ group, key }) => group === config.group && key === config.key)
  const builder = new BinaryBuilder();

  builder.writeInt32(messageId);
  builder.writeByte(ReqestTypes.removeEntry);

  if (cacheEntry) {
    removeEntryByConfig(cacheEntry);
    builder.writeByte(StatusCodes.success);
  } else {
    builder.writeByte(StatusCodes.notFound);
  }

  ws.send(builder.build());
};

const getEntry = (message, ws, messageId) => {
  const config = message.readConfig();
  const cacheConfig = getConfig();
  const builder = new BinaryBuilder();

  builder.writeInt32(messageId);
  builder.writeByte(ReqestTypes.getEntry);

  const cacheEntry = cacheConfig.find(({ group, key }) => group === config.group && key === config.key)

  if (!cacheEntry) {
    builder.writeByte(StatusCodes.notFound);

    ws.send(builder.build());

    return;
  }

  const data = fs.readFileSync(`cache/${config.group}/${config.key}`);

  builder.writeByte(StatusCodes.success);
  builder.writeConfig(cacheEntry);
  builder.writeBytes(data);

  ws.send(builder.build());
};

const addData = (message, ws, messageId) => {
  const config = message.readConfig();
  const cacheConfig = getConfig();
  const content = message.readBytes();

  const hasGroup = cacheConfig.find(({ group }) => group === config.group);
  const hasKeyGroup = cacheConfig.findIndex(({ group, key }) => group === config.group && key === config.key);

  if (hasKeyGroup !== -1) {
    cacheConfig.splice(hasKeyGroup, 1);
  }

  if (!hasGroup) {
    fs.mkdirSync(`cache/${config.group}`);
  }

  fs.writeFileSync(`cache/${config.group}/${config.key}`, content);

  cacheConfig.push(config);

  saveConfig();

  const builder = new BinaryBuilder();

  builder.writeInt32(messageId);
  builder.writeByte(ReqestTypes.addEntry);

  if (message.offset !== message.buffer.length) {
    builder.writeByte(StatusCodes.malformedPacket);
  } else {
    builder.writeByte(StatusCodes.success);
  }

  ws.send(builder.build());
}

const hasEntry = (message, ws, messageId) => {
  const cacheConfig = getConfig();
  const config = message.readConfig();

  const hasKeyGroup = cacheConfig.find(({ group, key }) => group === config.group && key === config.key);

  const builder = new BinaryBuilder();

  builder.writeInt32(messageId);
  builder.writeByte(ReqestTypes.hasEntry);

  if (message.offset !== message.buffer.length) {
    builder.writeByte(StatusCodes.malformedPacket);
  } else {
    builder.writeByte(StatusCodes.success);
  }

  builder.writeBoolean(!!hasKeyGroup);

  ws.send(builder.build());
}

const messageHandler = (data, ws) => {
  const message = new BinaryReader(data);
  const messageId = message.readInt32();
  const type = message.readByte();

  checkForExpiredCache();

  switch (type) {
    case ReqestTypes.heartbeat:
      console.log('received heartbeat');
      break;

    case ReqestTypes.getEntry:
      getEntry(message, ws, messageId);
      break;

    case ReqestTypes.addEntry:
      addData(message, ws, messageId);
      break;

    case ReqestTypes.hasEntry:
      hasEntry(message, ws, messageId);
      break;

    case ReqestTypes.removeEntry:
      removeEntry(message, ws, messageId);
      break;

    default:
      console.log('unkown type', type);

      break;
  }
};

wss.on('connection', (ws) => {
  ws.on('message', (data) => messageHandler(data, ws));
});
