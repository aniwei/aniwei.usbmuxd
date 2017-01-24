var plist           = require('plist'),
    bplistParser    = require('bplist-parser'),
    bplistCreator   = require('bplist-creator'),
    Emitter         = require('events').EventEmitter,
    bufferpack      = require('bufferpack'),
    assign          = require('lodash').assign,
    bplistHead      = 'bplist00';

module.exports = {
  __proto__: Emitter.prototype,

  isBinary: function (string) {
    var head   = bplistHead,
        length = head.length;

    return string.slice(0, length) == head;
  },

  parse: function (data) {
    var string = data.toString();

    try {
      return this.isBinary(string) ?
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
    var bplist = this.format(json, 'binary');

    return {
      type: 'binary',
      data: [bufferpack.pack('L', [bplist.length]), bplist]
    }
  },

  plist: function (json) {
    var content = new Buffer(this.format(json, 'xml')),
        header  = new Buffer(16);

    // 从offset 0开始写入头部
    // https://www.theiphonewiki.com/wiki/Usbmux
    // 写入数据大小
    header.writeUInt32LE(content.length + 16);

    // 写入版本
    header.writeUInt32LE(1, 4);

    // rcg4u/iphonessh
    header.writeUInt32LE(8, 8);

    header.writeUInt32LE(1, 12);

    return {
      type: 'xml',
      data: Buffer.concat([header, content])
    }
  }
}

function FormatterError (message) {
  Error.captureStackTrace(this, this);

  this.message = message || 'Formatter Error';
}

FormatterError.prototype      = Error.prototype;
FormatterError.prototype.name = 'Formatter Error';

// var test = `62 70 6c 69 73 74 30 30 a2 01 02 5f
// 10 17 44 4c 4d 65 73 73 61 67 65 50 72 6f 63 65
// 73 73 4d 65 73 73 61 67 65 d1 03 04 5b 4d 65 73
// 73 61 67 65 54 79 70 65 5f 10 11 53 63 72 65 65
// 6e 53 68 6f 74 52 65 71 75 65 73 74 08 0b 25 28
// 34 00 00 00 00 00 00 01 01 00 00 00 00 00 00 00
// 05 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
// 48`.match(/\w+/g).map(function (val) {
//   return parseInt(val, 16);
// });

// var d = module.exports.parse(new Buffer(test));

// console.log(d)
