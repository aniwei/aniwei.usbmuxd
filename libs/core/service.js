var Lockdownd   = require('./lockdownd'),
    App         = require('./index'),
    formatter   = require('./formatter'),
    Emitter     = require('events').EventEmitter,
    bufferpack  = require('bufferpack'),
    noop        = function () {};


module.exports = function (service) {
  return new Service(service);
}

function Service (service) {
  this.service = service;
}

Service.prototype = {
  __proto__: Emitter.prototype,

  start: function (callback) {
    this.app = this.app || new App();

    callback = callback || noop;

    this.app.on('attached', (function (data) {
      var lockdownd;

      lockdownd = new Lockdownd({
        id:     data.DeviceID,
        serial: data.Properties.SerialNumber
      });

      lockdownd.startService({
          service: this.service
      }, (function (service) {
        //console.log(service)

        if (!service.port) {
          return this.emit('error', '');
        }

        lockdownd.connect(service.port, (function (socket) {
          callback(socket, lockdownd);
        }).bind(this));
      }).bind(this));
    }).bind(this));

    this.app.listen();
  }
}
