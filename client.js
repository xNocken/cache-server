const { WebSocket } = require('ws');
const BinaryBuilder = require('./BinaryBuilder');
const RequestTypes = require('./enums/RequestTypes');

const ws = new WebSocket('ws://localhost:10000');

ws.onopen = () => {
  const builder = new BinaryBuilder();

  builder.writeInt32(1) // messageId
  builder.writeByte(RequestTypes.indexOf('getEntry'));
  builder.writeString('Hallo') // key

  ws.send(builder.build());
};

ws.onmessage = console.log;
