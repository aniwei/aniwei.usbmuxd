var uuid    = require('uuid'),
    assign  = require('lodash').assign,
    Emitter = require('events').EventEmitter,
    Bundle  = require('./bundle'),
    rpcTablel,
    noop;

noop = function () {};

rpcTable = {
  _rpc_reportIdentifier:          '_rpc_reportIdentifier:',
  _rpc_getConnectedApplications:  '_rpc_getConnectedApplications:',
  _rpc_forwardGetListing:         '_rpc_forwardGetListing:',
  _rpc_forwardSocketSetup:        '_rpc_forwardSocketSetup:',
  _rpc_forwardSocketData:         '_rpc_forwardSocketData:'
};

module.exports = function () {
  return new RPC();
}

function RPC () {
  this.id           = uuid.v4();
  this.bundleTable  = {};
}

RPC.prototype = {
  __proto__: Emitter.prototype,

  select: function (type) {
    var argv      = [].slice.call(arguments, 1),
        rpc       = this[type] || noop;

    return {
      __argument: rpc.apply(this, argv),
      __selector: rpcTable[type]
    };
  },

  _rpc_forwardGetListing: function (appKey) {
    return {
      WIRApplicationIdentifierKey: appKey,
      WIRConnectionIdentifierKey:  this.id
    }
  },

  _rpc_reportIdentifier: function () {
    return {
      WIRConnectionIdentifierKey: this.id
    }
  },

  _rpc_getConnectedApplications: function () {
    return {
      WIRConnectionIdentifierKey: this.id
    }
  },

  _rpc_forwardSocketSetup: function (app, index) {
    this.index      = index;
    this.current    = app;

    return {
      WIRSenderKey:                 this.sender,
      WIRPageIdentifierKey:         this.index,
      WIRConnectionIdentifierKey:   this.id,
      WIRApplicationIdentifierKey:  this.current
    };
  },

  _rpc_forwardSocketData: function (data) {
    return {
      WIRSenderKey:                 this.sender,
      WIRPageIdentifierKey:         this.index,
      WIRConnectionIdentifierKey:   this.id,
      WIRApplicationIdentifierKey:  this.current,
      WIRSocketDataKey:             data
    };
  }
}
