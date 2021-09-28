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

  writeByte(number) {
    this.datas.push({
      size: 1,
      data: Buffer.from([number]),
    })
  }

  writeBytes(bytes) {
    this.datas.push({
      data: bytes,
      size: bytes.length,
    })
  }

  writeString(string) {
    const buffer = Buffer.allocUnsafe(string.length + 4);

    buffer.writeInt32LE(string.length);

    Buffer.from(string).copy(buffer, 4);

    this.datas.push({
      data: buffer,
      size: buffer.length,
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
