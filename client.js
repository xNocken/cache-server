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
  [RequestTypes.removeEntry]: {},
};

const getEntry = (sendCofig) => {
  if (!ws.OPEN) {
    return;
  }

  return new Promise((resolve, reject) => {
    const builder = new BinaryBuilder();
    const messageId = sentMessages++;

    builder.writeInt32(messageId);
    builder.writeByte(RequestTypes.getEntry);
    builder.writeConfig(sendCofig);

    ws.send(builder.build());

    pendingMessages[RequestTypes.getEntry][messageId] = (statusCode, message) => {
      delete pendingMessages[RequestTypes.getEntry][messageId];

      if (statusCode === StatusCodes.success) {
        const config = message.readConfig();
        const data = message.readBytes();
        let uncompressed;
        let origData;

        if (config.isCompressed) {
          uncompressed = gunzipSync(data);
        } else {
          uncompressed = data;
        }

        switch (config.type) {
          case 'json':
            origData = JSON.parse(uncompressed.toString());
            break;

          default:
            origData = uncompressed;
        }

        resolve(origData);
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

  switch (inConfig.type) {
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

const hasEntry = (config) => {
  if (!ws.OPEN) {
    return;
  }

  return new Promise((resolve, reject) => {
    const builder = new BinaryBuilder();
    const messageId = sentMessages++;

    builder.writeInt32(messageId);
    builder.writeByte(RequestTypes.hasEntry);
    builder.writeConfig(config);

    ws.send(builder.build());

    pendingMessages[RequestTypes.hasEntry][messageId] = (statusCode, message) => {
      delete pendingMessages[RequestTypes.hasEntry][messageId];

      if (statusCode === StatusCodes.success) {
        const hasData = message.readBoolean();

        resolve(hasData);
      } else {
        reject(statusCode);
      }
    };
  })
}

const removeEntry = (config) => {
  if (!ws.OPEN) {
    return;
  }

  return new Promise((resolve, reject) => {
    const builder = new BinaryBuilder();
    const messageId = sentMessages++;

    builder.writeInt32(messageId);
    builder.writeByte(RequestTypes.removeEntry);
    builder.writeConfig(config);

    ws.send(builder.build());

    pendingMessages[RequestTypes.removeEntry][messageId] = (statusCode) => {
      delete pendingMessages[RequestTypes.removeEntry][messageId];

      if (statusCode === StatusCodes.success) {
        resolve();
      } else {
        reject(statusCode);
      }
    };
  })
}

ws.onopen = () => {
  // addEntry({
  //   key: 'gude',
  //   value: { ei: 'gude' },
  //   group: 'moinsen',
  //   expiresIn: 500,
  //   type: 'json',
  // }).then(() => {
  //   console.log('successfully saved');

  //   getEntry({
  //     key: 'gude',
  //     group: 'moinsen',
  //   }).then((data) => {
  //     console.log(data);
  //   })
  // }).catch(console.log);

  // removeEntry({
  //   key: 'gude',
  //   group: 'moinsen',
  // }).then(() => console.log('success')).catch(console.log);
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

  if (!pendingMessages[type][messageId]) {
    console.error(`received response with type ${type} and message id ${messageId} but no function was found`, pendingMessages)

    return;
  }

  pendingMessages[type][messageId](statusCode, response);
};

module.exports = {
  removeEntry,
  addEntry,
  hasEntry,
  getEntry,
}
