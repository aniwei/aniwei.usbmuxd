var plist           = require('plist'),
    bplistParser    = require('bplist-parser'),
    bplistCreator   = require('bplist-creator'),
    Emitter         = require('events').EventEmitter,
    bufferpack      = require('bufferpack'),
    bplistHead      = 'bplist00';

module.exports = {
  __proto__: Emitter.prototype,

  parse: function (data) {
    var string = data.toString(),
        head   = bplistHead,
        length = head.length,
        error;

    try {
      return string.slice(0, length) == head ?
        bplistParser.parseBuffer(data)[0] : plist.parse(string);
    } catch (e) {
      throw new FormatterError(e.message);
    }
  },

  format: function (json, type) {
    return type.toLowerCase() == 'xml' ?
      plist.build(json) : bplistCreator(json);
  },

  bplist: function (json) {
    return this.format(json, 'binary');
  },

  plist: function (json) {
    var content = new Buffer(this.format(json, 'xml')),
        header  = new Buffer(16);

    // 从offset 0开始写入头部
    // https://www.theiphonewiki.com/wiki/Usbmux
    // 写入数据大小
    header.writeUInt32LE(content.length + this.length);

    // 写入版本
    header.writeUInt32LE(1, 4);

    // rcg4u/iphonessh
    header.writeUInt32LE(8, 8);

    header.writeUInt32LE(1, 12);

    return Buffer.concat([header, content]);
  }
}

function FormatterError (message) {
  Error.captureStackTrace(this, this);

  this.message = message || 'Formatter Error';
}

FormatterError.prototype      = Error.prototype;
FormatterError.prototype.name = 'Formatter Error';
