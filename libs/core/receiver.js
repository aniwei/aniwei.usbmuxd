var formatter   = require('./formatter'),
    bufferpack  = require('bufferpack'),
    noop        = function () {};

module.exports = {
  xml: function (callback, type) {
    var total = 16,
        json,
        cache,
        size

    type  = type || 'little-endian';
    size  = 0;

    return function receive (data) {
      var length,
          content,
          self,
          source;

      json  = json || {};
      self  = this;

      if (!('length' in json)) {
        length = type == 'little-endian' ?
          data.readUInt32LE(0) - 16 : data.readUInt32BE('0');

        source = data.slice(total);
        json.length = length;
      } else {
        length = json.length;
        source = data;
      }

      if (cache) {
        if (data.length > length - size) {
          source = data.slice(0, length - size);
          size   += source.length;
        } else {
          source = data;
          size  += source.length;

          cache.push(source);
        }

        if (size === length) {
          content = Buffer.concat(cache, size);

          cache = undefined;
          size  = 0;
        }
      } else {
        if (source.length < json.length) {
          cache = cache || [];
          size += source.length;

          cache.push(source);
        } else {
          content = source.slice(0, length);
        }
      }

      if (content) {
        if (content.length > 0) {
          json.content = json.content = formatter.parse(content);
        }

        data = source.slice(length);

        if (json.content) {
          if (json.length > 0) {
            callback(json.content);

            cache = json = undefined;
          }
        }

        if (data.length > 0) {
          receive.call(this, data)
        }
      }
    }
  },

  binary: function (callback, type) {
    var total = 4,
        json,
        cache;

    type = type || 'little-endian';

    return function receive (data) {
      var length,
          content,
          self,
          source;

      json = json || {};

      if (!('length' in json)) {
        length = type == 'little-endian' ?
          data.readUInt32LE(0) - 4 : data.readUInt32BE('0');

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

  receive: function (type, callback, endian) {
    var handle = (type.toLowerCase() == 'xml' ? this.xml : this.binary)(callback, endian);

    return function (data) {
      if (data.length === 65536) {
        debugger;
      }

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
