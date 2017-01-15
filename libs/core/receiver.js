var formatter   = require('./formatter'),
    bufferpack  = require('bufferpack'),
    noop        = function () {};

module.exports = {
  xml: function (callback) {
    var total = 16,
        json,
        cache;


    return function receive (data) {
      var length,
          content,
          self,
          source;

      json = json || {};

      if (!('length' in json)) {
        if (data.length === 4) {
          length = data.readUInt32BE(0);
        } else {
          length = data.readUInt32LE(0) - total;
        }

        source = data.slice(total);
        json.length = length;
      } else {
        length = json.length;
        source = data;
      }

      content = source.slice(0, length);

      if (content.length > 0) {
        json.content = formatter.parse(content);
      }

      data    = source.slice(length);
      self    = this;

      if (json.content) {
        if (json.length > 0) {
          callback(json.content);

          json = undefined;
        }
      }

      if (data.length > 0) {
        receive.call(this, data)
      }
    }
  },

  binary: function (callback) {
    var length,
        data = [],
        size = 0;

    return function receive(res) {
      if (length === undefined) {
        length = bufferpack.unpack('L', res)[0];
      }

      data = data.concat(res);
      size += res.length;

      if (res.length === length) {
        callback(Buffer.concat(data, size));
      }
    }
  },

  receive: function (type, callback) {
    var handle = (type.toLowerCase() == 'xml' ? this.xml : this.binary)(callback);

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
