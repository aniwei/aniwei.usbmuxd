var Emitter         = require('events').EventEmitter,
    assign          = require('lodash').assign,
    project         = require('../../package'),
    usbmuxd         = require('./usbmuxd'),
    noop            = function () {},
    proto;


proto = module.exports = createApplication;

function createApplication () {
  return new Application();
}

function Application (options) {
  options = options || {};

  this.clientVersionString = {
    ClientVersionString: options.name         || project.name,
    ProgName:            options.name         || project.name,
    BundleID:            options.originzation || project.originzation
  }
}

Application.prototype = {
  __proto__: Emitter.prototype,

  listen: function (callback) {
    var json = assign({
          MessageType: 'Listen'
        }, this.clientVersionString),
        self  = this,
        handle;

    callback = callback || noop;

    usbmuxd.listen(json, (function (json) {
      this.emit(json.type, json.data, json.socket);
    }).bind(this));

    return this;
  }
}
