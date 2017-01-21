var receiver    = require('../../core/receiver'),
    formatter   = require('../../core/formatter'),
    RPC         = require('./rpc'),
    Service     = require('../../core/service'),
    Bundle      = require('./bundle'),
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

  startSession: function (bundle, callback) {
    callback = (callback || noop).bind(this);

    if (!bundle.page) {
      debugger;

      this.packet('_rpc_forwardSocketSetup', bundle.key, bundle.page.key);

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
    var rpc = this.rpc;

    callback = (callback || noop).bind(this);

    this.packet('_rpc_reportIdentifier');
    this.packet('_rpc_getConnectedApplications');

    // 设置app列表
    rpc.on('_rpc_reportConnectedApplicationList:', (function (argv) {
      var dict = argv.WIRApplicationDictionaryKey;

      Object.keys(dict).forEach((function (pid) {
        var app     = dict[pid];
            name    = app.WIRApplicationBundleIdentifierKey,
            bundle  = this.bundleTable[name];

        if (!bundle) {
          this.bundleTable[name] = new Bundle(name, pid);
        }
      }).bind(this.rpc));
    }).bind(this));

    rpc.on('_rpc_applicationSentListing:', (function (argv) {
      var bundleTable = rpc.bundleTable,
          key         = argv.WIRApplicationIdentifierKey,
          table       = argv.WIRListingKey,
          bundle;

      Object.keys(bundleTable).some(function (name) {
        var ref = bundleTable[name];

        if (bundleTable[name].key === key) {
          return bundle = ref;
        }
      });

      if (bundle) {
        bundle.pageTable = Object.keys(table).map(function (index) {
          var page = table[index];

          return {
            key:    page.WIRPageIdentifierKey,
            title:  page.WIRTitleKey,
            type:   page.WIRTypeKey,
            url:    page.WIRURLKey
          };
        });
      }

      callback(rpc.bundleTable);
    }).bind(this));
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
