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
  builder.writeByte(ReqestTypes.indexOf('getEntry'));

  if (!fs.existsSync(`cache/${key}`)) {
    builder.writeByte(StatusCodes.indexOf('notFound'));

    ws.send(builder.build());

    return;
  }

  const data = fs.readFileSync(`cache/${key}`);

  builder.writeByte(StatusCodes.indexOf('success'));
  builder.writeInt32(data.length);
  builder.writeBytes(data);

  ws.send(builder.build());
};

const addData = (message) => {
  const key = message.readString();
  const content = message.readBytes();

  fs.writeFileSync(`cache/${key}`, content);
}

const messageHandler = (data, ws) => {
  const message = new BinaryReader(data);
  const messageId = message.readInt32();
  const type = ReqestTypes[message.readByte()];

  switch (type) {
    case 'heartbeat':
      console.log('received heartbeat');

      break;

    case 'getEntry':
      getEntry(message, ws, messageId);

      break;

    case 'addData':
      addData(message);

      break;

    default:
      console.log('unkown type', type);

      break;
  }
};

wss.on('connection', (ws) => {
  ws.on('message', (data) => messageHandler(data, ws));
});
