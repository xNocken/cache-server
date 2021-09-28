const fs = require('fs');
const { WebSocketServer } = require('ws');
const BinaryBuilder = require('./BinaryBuilder');
const BinaryReader = require('./BinaryReader');
const ReqestTypes = require('./enums/RequestTypes');
const StatusCodes = require('./enums/StatusCodes');
const wss = new WebSocketServer({
  port: 10000,
});

const getEntry = (message, ws, messageId) => {
  const key = message.readString();
  const builder = new BinaryBuilder();

  builder.writeInt32(messageId);
  builder.writeByte(ReqestTypes.getEntry);

  if (!fs.existsSync(`cache/${key}`)) {
    builder.writeByte(StatusCodes.notFound);

    ws.send(builder.build());

    return;
  }

  const data = fs.readFileSync(`cache/${key}`);

  builder.writeByte(StatusCodes.success);
  builder.writeInt32(data.length);
  builder.writeBytes(data);

  ws.send(builder.build());
};

const addData = (message, ws, messageId) => {
  const config = message.readConfig();
  const content = message.readBytes();

  fs.writeFileSync(`cache/${config.key}`, content);

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

const messageHandler = (data, ws) => {
  const message = new BinaryReader(data);
  const messageId = message.readInt32();
  const type = message.readByte();

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

    default:
      console.log('unkown type', type);

      break;
  }
};

wss.on('connection', (ws) => {
  ws.on('message', (data) => messageHandler(data, ws));
});
