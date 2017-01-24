var receiver        = require('../../core/receiver'),
    formatter       = require('../../core/formatter'),
    Service         = require('../../core/service'),
    logger          = require('../../core/logger'),
    packet          = require('../../core/packet'),
    Emitter         = require('events').EventEmitter,
    uuid            = require('uuid'),
    async           = require('async'),
    noop            = function () {},
    SCREENSHOTR_VERSION_MAX,
    SCREENSHOTR_VERSION_MIN;

SCREENSHOTR_VERSION_MAX = 300;
SCREENSHOTR_VERSION_MIN = 0;

module.exports = {
  __proto__: Emitter.prototype,

  start: function (callback) {
    var service = new Service('com.apple.mobile.screenshotr');

    callback = (callback || noop()).bind(this);

    service.start((function (socket, lockdownd) {
      var series = [];

      logger.print('service', 'the com.apple.mobile.screenshotr service was connected');

      this.lockdownd      = lockdownd;
      this.socket         = socket;

      series.push((function (done) {
        this.getVersion(done);
      }).bind(this));

      series.push((function (done) {
        this.deviceReady(done);
      }).bind(this));

      async.series(series, function () {
        callback();
      });

    }).bind(this));

    this.service        = service;
  },

  deviceDisconnect: function () {
    var socket = this.socket,
        bplist = formatter.bplist([
          'DLMessageDisconnect',
          '___EmptyParameterString___'
        ]);

    callback = (callback || noop).bind(this);

    packet(bplist, socket, (function (json) {
      debugger;
      if (json[0] == 'DLMessageDeviceReady') {
        callback();
      }
    }).bind(this), 'big-endian');
  },

  deviceReady: function (callback) {
    var socket = this.socket,
        bplist = formatter.bplist([
          'DLMessageVersionExchange',
          'DLVersionsOk',
          SCREENSHOTR_VERSION_MAX
        ]);

    callback = (callback || noop).bind(this);

    packet(bplist, socket, (function (json) {
      if (json[0] == 'DLMessageDeviceReady') {
        callback();
      }
    }).bind(this), 'big-endian');
  },

  getVersion: function (callback) {
    var socket = this.socket;

    callback = callback || noop;

    socket.removeAllListeners();

    socket.on('data', receiver.receive('binary', (function (plist) {
      var version;

      if (plist) {
        if (plist.length == 3) {
          this.version = version = {
            max: plist[1],
            min: plist[2]
          };

          if (version.max > SCREENSHOTR_VERSION_MAX) {
            return this.emit('error', '')
          } else {
            if (version.max == SCREENSHOTR_VERSION_MAX) {
              if (version.min > SCREENSHOTR_VERSION_MIN) {
                return this.emit('error', '');
              }
            }
          }

          callback();
        }
      }
    }).bind(this)));
  },

  take: function (callback) {
    var socket = this.socket,
        bplist = formatter.bplist([
          'DLMessageProcessMessage',
          {MessageType: 'ScreenShotRequest'}
        ]);

    callback = (callback || noop).bind(this);

    packet(bplist, socket, (function (json) {
      var res;

      if (json[0] == 'DLMessageProcessMessage') {
        res = json[1] || {};

        if (res.MessageType == 'ScreenShotReply') {
          this.deviceDisconnect();
          this.lockdownd.stopSession();

          callback(res.ScreenShotData);
        }
      }
    }).bind(this), 'big-endian');
  }
}
