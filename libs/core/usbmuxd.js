var receiver  = require('./receiver'),
    packet    = require('./packet'),
    formatter = require('./formatter'),
    net       = require('net'),
    Emitter   = require('events').EventEmitter,
    noop      = function () {};

module.exports = {
  __proto__: Emitter.prototype,
  listen: function (json, callback) {
    var socket,
        plist;

    plist     = formatter.plist(json);
    callback  = callback || noop;

    socket = packet(plist, (function (json) {
      switch (json.MessageType) {
        case 'Attached':
        case 'Detached':
          callback({
            type: json.MessageType.toLowerCase(),
            data: json
          });
          break;
      }
    }).bind(this));
  }
}
