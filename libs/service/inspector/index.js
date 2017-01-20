var receiver    = require('../../core/receiver'),
    formatter   = require('../../core/formatter'),
    RPC         = require('./rpc'),
    Service     = require('../../core/service'),
    Emitter     = require('events').EventEmitter,
    noop        = function () {},
    MAX_RPC_LEN = 8096 - 500;



module.exports = {
  __proto__: Emitter.prototype,

  start: function (callback) {
    var service = new Service('com.apple.webinspector');

    callback = callback || noop();

    service.start((function (socket, lockdownd) {
      this.lockdownd = lockdownd;
      this.socket    = socket;

      socket.removeAllListeners();

      socket.on('data', receiver.receive('binary', (function (plist) {
        var data = formatter.parse(plist.WIRFinalMessageKey);

        console.log(data);

        this.rpc.emit(data.__selector, data.__argument);
      }).bind(this), 'big-endian'));

      callback(socket, lockdownd);
    }).bind(this));

    this.service = service;
    this.rpc     = new RPC();
  },

  command: function (data) {
    var json = new Buffer(JSON.stringify({
          id:     1,
          method: data.method,
          params:  data.params
        }));

    this.packet('_rpc_forwardSocketData', json);
  },

  startSession: function (app, index, callback) {
    var appPage = app.page,
        page;

    callback = (callback || noop).bind(this);

    appPage.some(function (p) {
      if (p.key !== index) {
        return false
      }

      page = p;

      return true;
    });

    if (!(page === undefined)) {
      this.packet('_rpc_forwardSocketSetup', app.key, index);

      this.rpc.once('_rpc_applicationUpdated:', function (args) {
        var isActive = args.WIRIsApplicationActiveKey === index &&
            //args.WIRApplicationIdentifierKey === app.key &&
            args.WIRIsApplicationProxyKey;

        if (isActive) {
          callback(args);
        }
      });
    }
  },

  connect: function (callback) {
    callback = (callback || noop).bind(this);

    this.packet('_rpc_reportIdentifier');

    this.rpc.on('_rpc_reportConnectedApplicationList:', (function (args) {
      var dict = args.WIRApplicationDictionaryKey;

      Object.keys(dict).forEach((function (pid) {
        var app   = dict[pid],
            name  = app.WIRApplicationNameKey;

        this.apps[name] = {
          bundle: app.WIRApplicationBundleIdentifierKey,
          key:    app.WIRApplicationIdentifierKey,
          name:   name,
          page:   []
        };
      }).bind(this.rpc));
    }).bind(this));

    this.rpc.on('_rpc_applicationSentListing:', (function (args) {
      var apps    = this.apps,
          key     = args.WIRApplicationIdentifierKey,
          listing = args.WIRListingKey;

      Object.keys(apps).some(function (name) {
        var app = apps[name];

        if (app.key == key) {
          return app.page = Object.keys(listing).map(function (index) {
            var page = listing[index];

            return {
              key:    page.WIRPageIdentifierKey,
              title:  page.WIRTitleKey,
              type:   page.WIRTypeKey,
              url:    page.WIRURLKey
            };
          })
        }
      });

      callback(this.apps);
    }).bind(this.rpc));
  },

  packet: function (sel) {
    var argv   = [].slice.call(arguments, 1),
        sel    = this.rpc.select.apply(this.rpc, [sel].concat(argv)),
        bin    = formatter.bplist(sel),
        cmd    = formatter.bplist({
          WIRFinalMessageKey : bin.data.pop()
        }),
        socket = this.socket;

    if (socket) {
      cmd.data.forEach(function (bplist) {
        socket.write(bplist);
      });
    }
  }
}
