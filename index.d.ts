type type = 'json' | 'default'

interface Settings {
  key: string;
  group: string;
  isCompressed: boolean;
  expiresAt: Date;
  addedAt: Date;
  size: number;
  uncompressedSize: number;
  type: type;
}

interface InSettings {
  value: object|Buffer,
  key: string;
  group: string;
  doNotCompress: boolean;
  expiresIn: Date;
  type: type;
}