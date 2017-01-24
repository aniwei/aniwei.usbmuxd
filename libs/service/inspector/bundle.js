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

function Notify (socket) {
  this.socket = socket;

  socket.removeAllListeners();
  socket.on('data', receiver.receive('binary', (function (plist) {
    var finalMessage,
        size = 0;

    return (function (plist) {
      var data,
          buffer;

      buffer  = plist.WIRFinalMessageKey || plist.WIRPartialMessageKey;
      size += buffer.length;

      finalMessage = finalMessage || [];
      finalMessage.push(buffer);

      if ('WIRFinalMessageKey' in plist) {
        buffer        = Buffer.concat(finalMessage, size);
        data          = formatter.parse(buffer);
        finalMessage  = undefined;
        size          = 0;

        console.log(data.__selector + ':', data.__argument);

        this.emit(data.__selector, data.__argument);
      }
    }).bind(this);
  }).bind(this)(), 'big-endian'));
}

Notify.prototype = {
  __proto__: Emitter.prototype,
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


function BundleManager (socket) {
  this.uuid         = uuid.v4().toUpperCase();
  this.bundleTable  = {};
  this.notify       = new Notify(socket);
}

BundleManager.prototype = {
  __proto__: Emitter.prototype,
  get: function (name) {
    var res = this.bundleTable[name];

    if (!res) {
      Object.keys(this.bundleTable).some((function (key) {
        var bundle = this.bundleTable[key];

        if (bundle.get('key') === name) {
          return res = bundle;
        }
      }).bind(this));
    }

    return res;
  },

  bundle: function (options) {
    var bundle   = options.bundle,
        which    = this.bundleTable[bundle],
        pages;

    if (!which) {
      this.bundleTable[bundle] = which = new Bundle();
    }

    options = assign({}, options, {
      uuid:   this.uuid,
      notify: this.notify
    });

    which.set(options);
  },

  registe: function (callback) {
    var json   = {uuid: this.uuid},
        notify = this.notify;

    callback = (callback || noop).bind(this);

    notify.packet('_rpc_reportIdentifier', json);
    notify.packet('_rpc_getConnectedApplications', json);

    // 设置app列表
    notify.on('_rpc_reportConnectedApplicationList:', (function (argv) {
      var dict = argv.WIRApplicationDictionaryKey;

      Object.keys(dict).forEach((function (pid) {
        var app     = dict[pid];

        this.bundle({
          bundle:   app.WIRApplicationBundleIdentifierKey,
          key:      app.WIRApplicationIdentifierKey,
          ready:    app.WIRIsApplicationReadyKey,
          proxy:    app.WIRIsApplicationProxyKey,
          active:   app.WIRIsApplicationActiveKey,
        });

      }).bind(this));

      callback(this);
    }).bind(this));
  }
}

function Bundle () {
  this.settings   = {};
  this.notify     = null;
}

Bundle.prototype = {
  __proto__: Emitter.prototype,

  listing: function (callback) {
    var notify = this.notify;

    callback = callback || noop;

    debugger;

    console.log('listing');

    if (this.get('listed')) {
      return this;
    }

    this.set('listed', true);

    notify.packet('_rpc_forwardGetListing', this.get('key', 'uuid'));
    notify.on('_rpc_applicationSentListing:', (function (argv) {
      var key         = argv.WIRApplicationIdentifierKey,
          table       = argv.WIRListingKey,
          bundle      = this,
          bundleData,
          pages,
          data,
          keys;

      if (bundle.get('key') === key) {
        bundleData = bundle.get('bundle', 'uuid', 'notify', 'key');
        pages      = bundle.get('page');

        keys = Object.keys(table);

        bundle.set({
          page: keys.map(function (index) {
            var data = table[index],
                page;

            if (pages) {
              pages.some(function (p) {
                var isExist,
                    pageData = p.get('index', 'key');

                isExist = pageData.index == data.WIRPageIdentifierKey &&
                  pageData.key           == bundleData.key;

                if (isExist) {
                  return page = p;
                }
              });
            }

            if (!page) {
              page = new Page();
            }

            page.set(assign({
              index:  data.WIRPageIdentifierKey,
              title:  data.WIRTitleKey,
              type:   data.WIRTypeKey,
              url:    data.WIRURLKey,
              key:    bundleData.key
            }, bundleData));

            return page;
          })
        });
      }

      this.set('listed', false);

      callback(this);
    }).bind(this));
  },

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
  this.notify   = null;
}

Page.prototype = {
  __proto__:  Emitter.prototype,
  get:        Bundle.prototype.get,
  set:        Bundle.prototype.set,

  getAll: function () {
    return this.get('key', 'uuid', 'sender', 'index');
  },

  startSession: function (index, callback) {
    var notify = this.notify,
        all    = this.getAll();

    if (typeof index == 'function') {
      callback = index;
      index    = 1;
    }

    if (!this.get('registed')) {
      notify.packet('_rpc_forwardIndicateWebView', all);
      notify.packet('_rpc_forwardSocketSetup', all);

      notify.on('_rpc_applicationSentData:', (function (argv) {
        var data   = this.get('sender', 'key'),
            isDest = argv.WIRDestinationKey == data.sender && data.key == argv.WIRApplicationIdentifierKey;

        if (isDest) {
          console.log(argv.WIRMessageDataKey.toString());
        }
      }).bind(this));

      this.set('registed', true);
    }

    callback = (callback || noop).bind(this);
    callback(this);
  },

  command: function (data) {
    var notify  = this.notify,
        json;

    if (Array.isArray(data)) {
      return data.forEach((function (data) {
        this.command(data);
      }).bind(this));
    }

    json    = new Buffer(JSON.stringify({
      id:     ++this.mid,
      method: data.method,
      params:  data.params
    }));

    notify.packet('_rpc_forwardSocketData', this.getAll(), json);

    return this;
  }
}
