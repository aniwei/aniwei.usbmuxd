var formatter   = require('./formatter'),
    bufferpack  = require('bufferpack'),
    noop        = function () {};

module.exports = {
  xml: function (callback) {
    var total = 16;

    return function receive (data) {
      var length,
          content,
          self,
          source,
          res;

      length  = data.readUInt32LE(0) - total;
      source  = data.slice(total);
      content = source.slice(0, length);
      data    = source(length);
      res     = [formatter.parse(content)];
      self    = this;

      if (data.length > 0) {
        res = res.concat(receive.call(this, data));
      }

      return res;
    }
  },

  binary: function (callback) {
    var length,
        data = [],
        size = 0;

    return function receive(data) {
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
        return handle.call(this, data);
      } catch (e) {
        throw new ReceiveError(e.message);
      }
    }
  }
}


function ReceiveError () {
  Error.captureStackTrace(this, this);

  this.message = message || 'Receive Error';
}

ReceiveError.prototype      = Error.prototype;
ReceiveError.prototype.name = 'Receive Error';
