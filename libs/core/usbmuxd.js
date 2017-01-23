var receiver  = require('./receiver'),
    packet    = require('./packet'),
    formatter = require('./formatter'),
    logger    = require('./logger'),
    net       = require('net'),
    Emitter   = require('events').EventEmitter,
    noop      = function () {},
    map;

map = {
  '2': 'iOS Devices is not connected.',
  '3': 'Port is not available or open.',
  '5': 'Malformed Request.'
}

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
        case 'Result':
          json.Number === 0 ?
            callback(json) : this.emit('error', map[json.Number] || 'Cannot listen usbmuxd');

          logger.print('usxmuxd', 'the Unix Domain Socket, usbmuxd, was listened');
          break;
      }
    }).bind(this), 'little-endian');


  }
}
