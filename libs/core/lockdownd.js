var receiver  = require('./receiver'),
    formatter = require('./formatter'),
    packet    = require('./packet'),
    logger    = require('./logger'),
    net       = require('net'),
    Emitter   = require('events').EventEmitter,
    async     = require('async'),
    assign    = require('lodash').assign,
    forge     = require('node-forge'),
    tls       = require('tls'),
    pki       = forge.pki,
    noop      = function () {},
    map;

map = {
  '2': 'iOS Devices is not connected.',
  '3': 'Port is not available or open.',
  '5': 'Malformed Request.'
}

module.exports = Lockdownd;

function Lockdownd (options) {
  options = options || {};

  this.id     = options.id;
  this.serial = options.serial;
  this.label  = options.label || 'aniwei.studio';
<<<<<<< HEAD

  process.on('SIGINT', (function () {
    this.stopSession(function () {
      logger.print('usbmuxd', 'the usbmuxd service was stopped')

      process.exit(0);
    });
  }).bind(this));
=======
>>>>>>> f920192bc91204c843e12e30231c2c76d4e6646c
}

Lockdownd.prototype = {
  __proto__: Emitter.prototype,
  connect: function (port, callback) {
    var json,
        socket,
        plist;

    if (typeof port == 'function') {
      callback = port;
      port     = undefined;
    }

    callback = callback || noop;

    port = port || 62078;
    json = assign({
      MessageType:  'Connect',
      DeviceID:     this.id,
      PortNumber:   ((port & 0xFF) << 8) | ((port >> 8) & 0xFF)
    });

    callback = callback || noop;
    plist    = formatter.plist(json);

    socket = packet(plist, (function (json) {
      var mess;

      switch (json.MessageType) {
        case 'Result':
          if (json.Number === 0) {
            logger.print('lockdownd', 'the lockdownd service was connected, portNumber is ' + port);

            callback(socket);
          } else {
            mess = map[json.Number];
            plist
            this.emit('error', mess || 'Could not connect to lockdownd.');
          }

          break;
      }
    }).bind(this), 'little-endian');

    this.socket     = socket;
    this.connecting = true;

    return socket;
  },

  getPariRecord: function (callback) {
    var plist = formatter.plist({
          MessageType: 'ReadPairRecord',
          PairRecordID: this.serial
        });

    if (!this.serial) {
      return this.emit('error', 'Cannot get PairRecord. Cause SerialNumber is Null');
    }

    callback = callback || noop;

    packet(plist, (function (res) {
      var buffer = res.PairRecordData,
          json   = formatter.parse(buffer);

      this.wifi = json.WiFiMACAddress;
      this.buid = json.SystemBUID;
      this.cert = json.DeviceCertificate;
      this.root = {
        cert: json.RootCertificate,
        key:  json.RootPrivateKey
      };
      this.host = {
        id:   json.HostID,
        cert: json.RootCertificate,
        key:  json.HostPrivateKey
      };

      callback(json);
    }).bind(this), 'little-endian');
  },

  startService: function (options, callback) {
    var series = [];

    callback = callback || noop;

    if (!this.session) {
      var self = this;

      series.push((function (done) {
        this.startSession(function () {
          done();
        });
      }).bind(this));
    }

    series.push((function (done) {
      var plist = formatter.bplist({
            Request: 'StartService',
            Service: options.service
          });

      if (this.session.ssl) {
        this.tlsSocket = new tls.TLSSocket(this.socket, {
          secureContext: tls.createSecureContext({
            key:  this.root.key,
            cert: this.root.cert
          })
        });
      }

      packet(plist, this.tlsSocket || this.socket, (function (res) {
        this.service = {
          port: res.Port,
          name: res.Service
        }

        done();
      }).bind(this), 'big-endian');

    }).bind(this));

    async.series(series, (function () {
      callback.call(this, this.service, root);
    }).bind(this));
  },

  queryType: function (callback) {
    var plist = formatter.bplist({
          Request: 'QueryType',
          Label:    this.label
        });

    callback = callback || noop;

    packet(plist, this.socket, function (res) {
      callback(res.Type);
    }, 'big-endian');
  },

  stopSession: function (callback) {
    var plist;

    callback = callback || noop;

    if (!this.session) {
      return callback();
    }

    plist = formatter.bplist({
      Label:      this.label,
      Request:    'StopSession',
      SessionID:  this.session.id
    });

    packet(plist, this.socket, function () {
    }, 'big-endian');

    this.session = undefined;

    callback();
  },

  startSession: function (callback) {
    var series = [];

    callback = callback || noop;

    series.push((function (done) {
      this.connect(function () {
        done();
      })
    }).bind(this));

    series.push((function (done) {
      this.queryType(function (type) {
        if (type == 'com.apple.mobile.lockdown') {
          done();
        }
      })
    }).bind(this));

    series.push((function (done) {
      this.getPariRecord(function (json) {
        done();
      });
    }).bind(this));

    series.push((function (done) {
      var plist = formatter.bplist({
            Label:      this.label,
            Request:    'StartSession',
            HostID:     this.host.id,
            SystemBUID: this.buid
          });

      packet(plist, this.socket, (function (res) {
        var json = res;

        this.session = {
          id:  json.SessionID,
          ssl: json.EnableSessionSSL
        }

        done();
      }).bind(this), 'big-endian');

    }).bind(this));

    async.series(series, function () {
      callback.call(this, this.session);
    });
  }
}
