var receiver        = require('../../core/receiver'),
    formatter       = require('../../core/formatter'),
    Service         = require('../../core/service'),
    BundleManager   = require('./bundle'),
    Emitter         = require('events').EventEmitter,
    uuid            = require('uuid'),
    noop            = function () {},
    MAX_RPC_LEN     = 8096 - 500;



module.exports = {
  __proto__: Emitter.prototype,

  start: function (callback) {
    var service = new Service('com.apple.webinspector');

    callback = callback || noop();

    service.start((function (socket, lockdownd) {
      var bundleManager = new BundleManager(socket);

      this.lockdownd = lockdownd;
      this.socket    = socket;

      this.bundleManager  = bundleManager;

      bundleManager.registe(function () {
        callback.call(bundleManager, bundleManager, lockdownd);
      });
    }).bind(this));

    this.service        = service;
  }
}
