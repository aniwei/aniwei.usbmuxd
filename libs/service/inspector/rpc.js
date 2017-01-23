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
  _rpc_forwardSocketData:         '_rpc_forwardSocketData:',
  _rpc_forwardIndicateWebView:    '_rpc_forwardIndicateWebView:'
};

module.exports = {
  select: function (type) {
    var argv      = [].slice.call(arguments, 1),
        rpc       = this[type] || noop;

    return {
      __argument: rpc.apply(this, argv),
      __selector: rpcTable[type]
    };
  },

  _rpc_forwardIndicateWebView: function (bundle) {
    return {
      WIRApplicationIdentifierKey: bundle.key,
      WIRConnectionIdentifierKey:  bundle.uuid,
      WIRPageIdentifierKey:        bundle.index,
      WIRIndicateEnabledKey:       true
    }
  },

  _rpc_forwardGetListing: function (bundle) {
    return {
      WIRApplicationIdentifierKey: bundle.key,
      WIRConnectionIdentifierKey:  bundle.uuid
    }
  },

  _rpc_reportIdentifier: function (bundle) {
    return {
      WIRConnectionIdentifierKey: bundle.uuid
    }
  },

  _rpc_getConnectedApplications: function (bundle) {
    return {
      WIRConnectionIdentifierKey: bundle.uuid
    }
  },

  _rpc_forwardSocketSetup: function (bundle) {
    return {
      WIRConnectionIdentifierKey:   bundle.uuid,
      WIRAutomaticallyPause:        false,
      WIRSenderKey:                 bundle.sender,
      WIRPageIdentifierKey:         bundle.index,
      WIRApplicationIdentifierKey:  bundle.key
    };
  },

  _rpc_forwardSocketData: function (bundle, data) {
    return {
      WIRConnectionIdentifierKey:   bundle.uuid,
      WIRSenderKey:                 bundle.sender,
      WIRPageIdentifierKey:         bundle.index,
      WIRApplicationIdentifierKey:  bundle.key,
      WIRSocketDataKey:             data
    };
  }
}
