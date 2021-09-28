const { WebSocket } = require('ws');
const BinaryBuilder = require('./BinaryBuilder');
const BinaryReader = require('./BinaryReader');
const RequestTypes = require('./enums/RequestTypes');
const StatusCodes = require('./enums/StatusCodes');
const { gzipSync, gunzipSync } = require('zlib');

const ws = new WebSocket('ws://localhost:10000');
let sentMessages = 0;

const pendingMessages = {
  [RequestTypes.getEntry]: {},
  [RequestTypes.hasEntry]: {},
  [RequestTypes.addEntry]: {},
};

const getEntry = (key) => {
  if (!ws.OPEN) {
    return;
  }

  return new Promise((resolve, reject) => {
    const builder = new BinaryBuilder();
    const messageId = sentMessages++;

    builder.writeInt32(messageId);
    builder.writeByte(RequestTypes.getEntry);
    builder.writeString(key);

    ws.send(builder.build());

    pendingMessages.getEntry[messageId] = (statusCode, message) => {
      delete pendingMessages.getEntry[messageId];

      if (statusCode === 'success') {
        resolve(message.readBytes());
      } else {
        reject(statusCode);
      }
    };
  })
}

/**
 * 
 * @param {InSettings} inConfig 
 * @returns {Promise}
 */
const addEntry = (inConfig) => {
  if (!ws.OPEN) {
    return;
  }

  /**
   * @type {Settings}
   */
  const config = {
    expiresAt: Date.now() + inConfig.expiresIn * 1000,
    key: inConfig.key,
    group: inConfig.group,
    addedAt: Date.now(),
    isCompressed: !inConfig.doNotCompress,
    type: inConfig.type,
  }

  let uncompressed;

  switch(inConfig.type) {
    case 'json':
      uncompressed = JSON.stringify(inConfig.value);
      break;

    default:
      uncompressed = inConfig.value;
      break;
  }

  let compressed;

  if (inConfig.doNotCompress) {
    compressed = uncompressed;
  } else {
    compressed = gzipSync(uncompressed);
  }

  config.size = compressed.length;
  config.uncompressedSize = uncompressed.length;

  return new Promise((resolve, reject) => {
    const builder = new BinaryBuilder();
    const messageId = sentMessages++;

    builder.writeInt32(messageId);
    builder.writeByte(RequestTypes.addEntry);
    builder.writeConfig(config);
    builder.writeBytes(compressed);

    ws.send(builder.build());

    pendingMessages[RequestTypes.addEntry][messageId] = (statusCode) => {
      delete pendingMessages[RequestTypes.addEntry][messageId];

      if (statusCode === StatusCodes.success) {
        resolve();
      } else {
        reject(statusCode);
      }
    };
  });
}

ws.onopen = () => {
  addEntry({
    key: 'gude',
    value: 'was gehtn',
    group: 'moinsen',
    expiresIn: 5,
  }).then(() => {
    console.log('successfully saved');
  }).catch(console.log);
};

ws.onmessage = ({ data }) => {
  const response = new BinaryReader(data);

  const messageId = response.readInt32();
  const type = response.readByte();
  const statusCode = response.readByte();

  if (type === 'heartbeat') {
    // TODO: add heartbeat

    return;
  }

  pendingMessages[type][messageId](statusCode, response);
};
