var uuid        = require('uuid'),
    assign      = require('lodash').assign,
    Emitter     = require('events').EventEmitter,
    receiver    = require('../../core/receiver'),
    formatter   = require('../../core/formatter'),
    logger      = require('../../core/logger'),
    rpc         = require('./rpc'),
    pid         = 0,
    noop;

noop = function () {};

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
      size    += buffer.length;

      finalMessage = finalMessage || [];
      finalMessage.push(buffer);

      if ('WIRFinalMessageKey' in plist) {
        buffer        = Buffer.concat(finalMessage, size);
        data          = formatter.parse(buffer);
        finalMessage  = undefined;
        size          = 0;

        this.dispatch(data);

        this.emit(data.__selector, data.__argument);
      }
    }).bind(this);
  }).bind(this)(), 'big-endian'));

  this.tasks = [];
}

Notify.prototype = {
  __proto__: Emitter.prototype,

  dispatch: function (data) {
    var selector = data.__selector,
        argv     = data.__argument;

    this.tasks.forEach((function (task) {
      var name = task + '.' + selector;

      this.emit(name, argv);
    }).bind(this));

    this.emit(selector, argv);
  },

  registe: function (name) {
    if (name) {
      this.tasks.push(name);
    }
  },

  unregiste: function (name) {
    var index = this.tasks.indexOf(name);

    if (index > -1) {
      this.tasks.splice(index ,1);
    }
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


function BundleManager (socket) {
  this.uuid         = uuid.v4().toUpperCase();
  this.notify       = new Notify(socket);
}

BundleManager.prototype = {
  __proto__: Emitter.prototype,

  watch: function (bundleName) {
    var notify = this.notify;

    return new Task(bundleName, this.uuid, notify);
  },

  registe: function (callback) {
    var json   = {uuid: this.uuid},
        notify = this.notify,
        bundleHandle;

    callback = (callback || noop).bind(this);

    notify.packet('_rpc_reportIdentifier', json);

    callback(this);
  }
}

function Task (name, uuid, notify) {
  var json = {uuid: uuid};

  this.name          = name;
  this.notify        = notify;
  this.uuid          = uuid;
  this.bundleTable   = {};
  this.pageTable     = {};
  this.pageContainer = [];

  this.method   = [
    '_rpc_reportConnectedApplicationList',
    '_rpc_applicationDisconnected',
    '_rpc_applicationConnected',
    '_rpc_applicationUpdated',
    '_rpc_applicationSentListing'
  ].map((function (met) {
    return {
      name:     name + '.' + met + ':',
      handle:   (this[met] || noop).bind(this)
    }
  }).bind(this));

  notify.packet('_rpc_getConnectedApplications', json);

  this.attach();
}

Task.prototype = {
  __proto__: Emitter.prototype,

  detach: function () {
    var notify = this.notify;

    this.method.forEach(function (method) {
      notify.removeAllListeners(method.name);
    });

    notify.unregiste(this.name);
  },

  attach: function () {
    var notify = this.notify;

    this.method.forEach(function (method) {
      notify.on(method.name, method.handle);
    });

    notify.registe(this.name);
  },

  inspect: function (page) {
    var inst = new Page(page, this.uuid, this.notify);

    this.pageContainer.push(inst);

    return inst;
  },

  ready: function (callback) {
    this.on('ready', callback || noop);
  },

  close: function (callback) {
    this.on('close', callback || noop);
  },

  _rpc_reportConnectedApplicationList: function (argv) {
    var dict = argv.WIRApplicationDictionaryKey || {},
        name = this.name,
        keys = Object.keys(dict),
        info,
        notify,
        listing,
        bundleTable;

    notify      = this.notify;
    bundleTable = this.bundleTable;

    listing = (function (pid, bundle) {
      var original = bundleTable[pid],
          isModify = true;

      if (original) {
        isModify = !(original.pid   == bundle.WIRApplicationIdentifierKey && 
                   original.ready   == bundle.WIRIsApplicationReadyKey && 
                   original.proxy   == bundle.WIRIsApplicationProxyKey && 
                   original.active  == bundle.WIRIsApplicationActiveKey);
      }

      bundleTable[pid] = {
        name:     bundle.WIRApplicationBundleIdentifierKey,
        pid:      bundle.WIRApplicationIdentifierKey,
        ready:    bundle.WIRIsApplicationReadyKey,
        proxy:    bundle.WIRIsApplicationProxyKey,
        active:   bundle.WIRIsApplicationActiveKey,
      };

      if (isModify) {
        notify.packet('_rpc_forwardGetListing', {
          uuid:   this.uuid,
          pid:    pid
        }); 
      }
    }).bind(this);

    keys.forEach((function (pid) {
      var bundle = dict[pid],
          bundleName;

      bundleName = bundle.WIRApplicationBundleIdentifierKey;

      if (bundleName === name) {
        listing(pid, bundle);
      }
    }).bind(this));
  },

  _rpc_applicationDisconnected: function (argv) {
    var pageTable   = this.pageTable,
        bundleTable = this.bundleTable,
        pid         = argv.WIRApplicationIdentifierKey,
        container   = this.pageContainer,
        bundle;

    if (argv.WIRApplicationBundleIdentifierKey == this.name) {
      if (pid in bundleTable) {
        bundle = bundleTable[pid];

        delete bundleTable[pid];

        this.pageContainer = container.filter(function (inst) {
          if (inst.page.pid === pid) {
            inst.detach();

            return false;
          }

          return true;
        });
      }
    }
  },

  _rpc_applicationUpdated: function (argv) {
    var isActive;

    isActive = argv.WIRIsApplicationActiveKey;

    if (!isActive) {

    }
  },

  _rpc_applicationConnected: function (argv) {
    var name = this.name,
        notify,
        listing,
        bundleName,
        bundleTable,
        pid;

    notify      = this.notify;
    bundleTable = this.bundleTable;
    bundleName  = argv.WIRApplicationBundleIdentifierKey;
    pid         = argv.WIRApplicationIdentifierKey;

    listing = (function (pid, bundle) {
      var original = bundleTable[pid],
          isModify = true;

      if (original) {
        isModify = !(original.pid   == bundle.WIRApplicationIdentifierKey && 
                   original.ready   == bundle.WIRIsApplicationReadyKey && 
                   original.proxy   == bundle.WIRIsApplicationProxyKey && 
                   original.active  == bundle.WIRIsApplicationActiveKey);
      }

      bundleTable[pid] = {
        name:     bundle.WIRApplicationBundleIdentifierKey,
        pid:      bundle.WIRApplicationIdentifierKey,
        proxy:    bundle.WIRIsApplicationProxyKey,
        active:   bundle.WIRIsApplicationActiveKey,
      };

      if (isModify) {
        notify.packet('_rpc_forwardGetListing', {
          uuid:   this.uuid,
          pid:    pid
        }); 
      }
    }).bind(this);

    if (bundleName === name) {
      listing(pid, argv);
    }
  },

  _rpc_applicationSentListing: function (argv) {
    var bundleTable = this.bundleTable,
        pageTable   = this.pageTable,
        pid         = argv.WIRApplicationIdentifierKey,
        keys        = Object.keys(argv.WIRListingKey),
        listing     = argv.WIRListingKey,
        notify      = this.notify,
        isReady,
        object,
        sender,
        page,
        flat,
        ls;
    
    if (pid in bundleTable) {
      object = pageTable[pid];

      flat = function (pageTable) {
        var keys = Object.keys(pageTable),
            res  = [];

        keys.forEach(function (pid) {
          var one = pageTable[pid];

          res = res.concat(Object.keys(one).map(function (index) {
            return one[index];
          }));
        });

        return res;
      }

      if (!(pid in pageTable)) {
        object = pageTable[pid] = {};
      }

      keys.forEach((function (idx) {
        var ref = listing[idx],
            key = ref.WIRPageIdentifierKey;

        page    = object[key];

        if (!(key in object)) {
          isReady = true

          sender  = {
            sender: uuid.v4().toUpperCase()
          };

          page = object[key] = assign(page, {
            index:  ref.WIRPageIdentifierKey,
            title:  ref.WIRTitleKey,
            type:   ref.WIRTypeKey,
            url:    ref.WIRURLKey,
            pid:    pid
          }, sender);

          notify.packet('_rpc_forwardSocketSetup', {
            uuid:   this.uuid,
            index:  page.index,
            pid:    pid,
            sender: page.sender
          });
        }
      }).bind(this));

      if (isReady) {
        ls = flat(pageTable);

        if (ls.length > 0) {
          this.emit('ready', ls);
        }
      }
    }
  }
}

function Page (page, uuid, notify) {
  this.page   = page;
  this.uuid   = uuid;
  this.notify = notify;
  this.mid    = 1;
  this.name   = this.page.sender;

  this.method   = [
    '_rpc_applicationSentData'
  ].map((function (met) {
    return {
      name:     this.name + '.' + met + ':',
      handle:   (this[met] || noop).bind(this)
    }
  }).bind(this));

  this.attach();
}

Page.prototype = {
  __proto__: Emitter.prototype,

  detach: function () {
    var notify = this.notify;

    this.method.forEach(function (method) {
      notify.removeAllListeners(method.name);
    });

    notify.unregiste(this.name);
  },

  attach: function () {
    var notify = this.notify;

    this.method.forEach(function (method) {
      notify.on(method.name, method.handle);
    });

    notify.registe(this.name);
  },

  command: function (cmd, param) {
    var notify  = this.notify,
        json;

    if (Array.isArray(cmd)) {
      return cmd.forEach((function (data) {
        this.command(data);
      }).bind(this));
    }

    if (typeof cmd == 'string') {
      cmd = {
        method: cmd,
        params: param
      };
    }

    json    = new Buffer(JSON.stringify({
      id:       cmd.id,
      method:   cmd.method,
      params:   cmd.params
    }));

    notify.packet('_rpc_forwardSocketData', {
      uuid:   this.uuid,
      sender: this.page.sender,
      index:  this.page.index,
      pid:    this.page.pid
    }, json);

    logger.print('inspect.sent', this.page.title + ',' + cmd.method);

    return this;
  },

  message: function (callback) {
    callback = (callback || noop).bind(this);

    this.on('message', callback);
  },

  _rpc_applicationSentData: function (argv) {
    var pid   = argv.WIRApplicationIdentifierKey,
        dest  = argv.WIRDestinationKey,
        page  = this.page,
        data  = JSON.parse(argv.WIRMessageDataKey ? argv.WIRMessageDataKey.toString() : '{}');

    if (
      pid   == page.pid &&
      dest  == page.sender
    ) {
      logger.print('inspect.received', this.page.title);

      this.emit('message', data);
    }
  },
}