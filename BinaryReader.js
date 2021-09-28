const Settings = require('./enums/Settings');

class BinaryReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  readConfig() {
    const count = this.readInt32();
    const config = {};

    for (let i = 0; i < count; i++) {
      const targetConfigIndex = this.readInt32();
      const targetConfig = Settings[targetConfigIndex];

      if (!targetConfig) {
        throw new Error(`invalid config keyindex ${targetConfigIndex}`);
      }

      switch(targetConfig.type) {
        case 'string':
          config[targetConfig.name] = this.readString();
          break;

        case 'int32':
          config[targetConfig.name] = this.readInt32();
          break;
        
        case 'int64': 
          config[targetConfig.name] = this.readInt64();
          break;

        case 'boolean':
          config[targetConfig.name] = this.readBoolean();
          break;

        default:
          throw new Error(`invalid config type ${targetConfig.type}`);
      }
    }

    return config;
  }

  readInt64() {
    const value = this.buffer.slice(this.offset, this.offset + 8).readBigInt64LE();
    
    this.offset += 8;

    return parseInt(value, 10);
  }

  readBytes() {
    const length = this.readInt32();

    const value = this.buffer.slice(this.offset, this.offset + length);

    this.offset += length;

    return value;
  }

  readString() {
    const length = this.readInt32();

    const value = this.buffer.slice(this.offset, this.offset + length).toString();

    this.offset += length;

    return value;
  }

  readInt32() {
    const value = this.buffer.slice(this.offset, this.offset + 4).readInt32LE();

    this.offset += 4;

    return value;
  }

  readBoolean() {
    return this.readByte() === 1;
  }

  readByte() {
    const value = this.buffer[this.offset];

    this.offset += 1;

    return value;
  }
}

module.exports = BinaryReader;
