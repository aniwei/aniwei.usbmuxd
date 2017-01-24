var receiver        = require('../../core/receiver'),
    formatter       = require('../../core/formatter'),
    Service         = require('../../core/service'),
    logger          = require('../../core/logger'),
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

      logger.print('service', 'the com.apple.webinspector service was connected');

      this.lockdownd      = lockdownd;
      this.socket         = socket;
      this.bundleManager  = bundleManager;

      bundleManager.registe(callback);
    }).bind(this));

    this.service        = service;
  }
}
