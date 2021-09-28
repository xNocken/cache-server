const Settings = require('./enums/Settings');

class BinaryBuilder {
  constructor() {
    this.datas = [];
  }

  writeInt32(number) {
    const buffer = Buffer.alloc(4);

    buffer.writeInt32LE(number);

    this.datas.push({
      size: 4,
      data: buffer,
    })
  }

  writeConfig(config) {
    const configEnties = Object.entries(config).filter(([, value]) => value !== undefined);

    this.writeInt32(configEnties.length);

    configEnties.forEach(([key, value]) => {
      const targetConfigIndex = Settings.findIndex(({ name }) => name === key);
      const targetConfig = Settings[targetConfigIndex];

      if (!targetConfig) {
        throw new Error(`invalid config key ${key}`);
      }

      this.writeInt32(targetConfigIndex);
      switch(targetConfig.type) {
        case 'string':
          this.writeString(value);
          break;

        case 'int32':
          this.writeInt32(value);
          break;
        
        case 'int64': 
          this.writeInt64(value);
          break;

        case 'boolean':
          this.writeBoolean(value);
          break;
      }
    });
  }

  writeInt64(time) {
    const buffer = Buffer.alloc(8);

    buffer.writeBigInt64LE(BigInt(time));

    this.datas.push({
      size: 8,
      data: buffer,
    })
  }

  writeByte(number) {
    this.datas.push({
      size: 1,
      data: Buffer.from([number]),
    })
  }

  writeBytes(bytes) {
    this.writeInt32(bytes.length);

    this.datas.push({
      data: bytes,
      size: bytes.length,
    })
  }

  /**
   * @param {String} string 
   */
  writeString(string) {
    this.writeInt32(string.length);

    this.datas.push({
      data: Buffer.from(string),
      size: string.length,
    })
  }

  writeBoolean(value) {
    this.datas.push({
      size: 1,
      data: Buffer.from([value]),	
    })
  }

  build() {
    const length = this.datas.reduce((prev, {size}) => prev + size, 0);
    const buffer = Buffer.allocUnsafe(length);

    let offset = 0;

    this.datas.forEach(({ data, size }) => {
      data.copy(buffer, offset);

      offset += size;
    })

    return buffer;
  }
}

module.exports = BinaryBuilder;
