var formatter   = require('./formatter'),
    bufferpack  = require('bufferpack'),
    noop        = function () {};

function receiver(dataType) {

  return function (callback, endian) {
    var offset = dataType == 'xml' ? 16 : 4,
        buffer = new Buffer(0),
        handle,
        timer;

    endian   = endian || 'little-endian';
    callback = callback || noop;

    handle = function () {
      var length,
          source,
          json;
      
      length = endian == 'little-endian' ?
        buffer.readUInt32LE(0) - offset : buffer.readUInt32BE(0);

      if (!(length > buffer.length)) {
        source = buffer.slice(offset, length + offset);

        json    = formatter.parse(source);
        buffer  = buffer.slice(length + offset);

        callback(json);

        if (buffer.length > 0) {
          handle(buffer);
        }
      }
    }

    return function receive (data) {
      buffer = Buffer.concat([buffer, data], buffer.length + data.length);

      clearTimeout(timer);

      timer = setTimeout(function () {
        handle();
      },50);
    }
  }
}

module.exports = {
  xml: receiver('xml'),
  binary: receiver('binary'),

  receive: function (type, callback, endian) {
    var handle = (type.toLowerCase() == 'xml' ? this.xml : this.binary)(callback, endian);

    return function (data) {
      try {
        handle.call(this, data);
      } catch (e) {
        throw new ReceiveError(e.message + '\n' + e.stack);
      }
    }
  }
}


function ReceiveError (message) {
  Error.captureStackTrace(this, ReceiveError);

  this.message = message  || 'Receive Error';
}

ReceiveError.prototype      = Error.prototype;
ReceiveError.prototype.name = 'ReceiveError';
