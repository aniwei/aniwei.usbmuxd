var uuid        = require('uuid'),
    assign      = require('lodash').assign,
    Emitter     = require('events').EventEmitter,
    receiver    = require('../../core/receiver'),
    formatter   = require('../../core/formatter'),
    rpc         = require('./rpc'),
    bid         = 0,
    MessageNotifyCenter;

module.exports = function (name, key) {
  return new BundleManager(name, key);
};

MessageNotifyCenter = {
  __proto__: Emitter.prototype
}

function BundleManager (socket) {
  this.uuid         = uuid.v4().toUpperCase();
  this.bundleTable  = {};

  socket.removeAllListeners();

  socket.on('data', receiver.receive('binary', (function (plist) {
    var data = formatter.parse(plist.WIRFinalMessageKey);

    console.log(data);

    if (MessageNotifyCenter) {
      MessageNotifyCenter.emit(data.__selector, data.__argument);
    }
  }).bind(this), 'big-endian'));

  this.socket = socket;
}

BundleManager.prototype = {
  __proto__: Emitter.prototype,
  get: function (name) {
    var res = this.bundleTable[name];

    if (!res) {
      Object.keys(this.bundleTable).some((function (key) {
        var bundle = this.bundleTable[key];

        if (bundle.get('app') === name) {
          return res = bundle;
        }
      }).bind(this));
    }

    return res;
  },

  bundle: function (options) {
    var name   = options.name,
        bundle = this.bundleTable[name];

    if (!bundle) {
      this.bundleTable[name] = bundle = new Bundle();
    }

    options = assign({}, options, {
      uuid:   this.uuid,
      socket: this.socket
    });

    bundle.set(options);
  },

  registe: function (callback) {
    var json = {uuid: this.uuid};

    this.packet('_rpc_reportIdentifier', json);
    this.packet('_rpc_getConnectedApplications', json);

    // 设置app列表
    MessageNotifyCenter.on('_rpc_reportConnectedApplicationList:', (function (argv) {
      var dict = argv.WIRApplicationDictionaryKey;

      Object.keys(dict).forEach((function (pid) {
        var app     = dict[pid];

        this.bundle({
          uuid:     this.uuid,
          name:     app.WIRApplicationBundleIdentifierKey,
          app:      app.WIRApplicationIdentifierKey,
          ready:    app.WIRIsApplicationReadyKey,
          proxy:    app.WIRIsApplicationProxyKey,
          active:   app.WIRIsApplicationActiveKey,
          page:     []
        });

      }).bind(this));
    }).bind(this));

    MessageNotifyCenter.on('_rpc_applicationSentListing:', (function (argv) {
      var key         = argv.WIRApplicationIdentifierKey,
          pages       = argv.WIRListingKey,
          bundle      = this.get(key),
          data;

      if (bundle) {
        bundleData = bundle.get('name', 'uuid', 'socket', 'app');

        bundle.set({
          page: Object.keys(pages).map(function (index) {
            var data = pages[index],
                page;

            page = new Page();

            page.set(assign({
              index:  data.WIRPageIdentifierKey,
              title:  data.WIRTitleKey,
              type:   data.WIRTypeKey,
              url:    data.WIRURLKey,
              app:    data.app
            }, bundleData));

            return page;
          })
        });
      }

      callback(this);
    }).bind(this));
  },

  packet: function (sel) {
    var argv   = [].slice.call(arguments, 1),
        sel    = rpc.select.apply(rpc, [sel].concat(argv)),
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

function Bundle () {
  this.settings   = {};
  this.socket     = null;
}

Bundle.prototype = {
  __proto__: Emitter.prototype,

  get: function (key) {
    var argv = [].slice.call(arguments),
        res;

    if (argv.length === 1) {
      return this.settings[key] || this[key];
    }

    res = {};

    argv.forEach((function (key) {
      res[key] = this[key] || this.settings[key];
    }).bind(this));

    return res;
  },

  set: function (key, value) {
    if (typeof key == 'object') {
      return Object.keys(key).forEach((function (k) {
        this.set(k, key[k]);
      }).bind(this));
    }

    key in this ?
      this[key] = value :
      this.settings[key] = value

    return this;
  }
}

function Page (pages) {
  this.settings = {};
  this.mid      = 0;
  this.sender   = uuid.v4().toUpperCase();
  this.socket   = null;
}

Page.prototype = {
  __proto__:  Emitter.prototype,
  get:        Bundle.prototype.get,
  set:        Bundle.prototype.set,
  packet:     BundleManager.prototype.packet,

  getAll: function () {
    return this.get('app', 'uuid', 'sender', 'index');
  },

  startSession: function (index, callback) {
    if (typeof index == 'function') {
      callback = index;
      index    = 1;
    }

    callback = (callback || noop).bind(this);

    this.packet('_rpc_forwardSocketSetup', this.getAll());

    callback(this);

    // MessageNotifyCenter.on('_rpc_applicationConnected:', function () {
    //   debugger;
    // });
  },

  command: function (data) {
    var json = new Buffer(JSON.stringify({
          id:     ++this.mid,
          method: data.method,
          params:  data.params
        }));

    this.packet('_rpc_forwardSocketData', this.getAll(), json);
  },
}
