class BinaryReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
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

  readByte() {
    const value = this.buffer[this.offset];

    this.offset += 1;

    return value;
  }
}

module.exports = BinaryReader;
