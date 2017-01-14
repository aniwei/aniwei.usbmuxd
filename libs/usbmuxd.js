var config    = require('./config'),
    receiver  = require('./receiver'),
    net       = require('net'),
    Emitter   = require('events').EventEmitter;

module.exports = {
  __proto__: Emitter.prototype,
  listen: function (plist) {
    var socket = this.packet(plist, function (res) {
      debugger;
    });

  },

  packet: function (plist, callback) {
    var socket;

    socket = net.connect(config.address);

    socket.on('data', receiver.receive('xml', callback));

    if (!Array.isArray(plist)) {
      plist = [plist];
    }

    plist.forEach(function (plist) {
      console.log(plist.toString())

      socket.write(plist);
    });

    return socket;
  },

  dispatch: function () {

  }
}
