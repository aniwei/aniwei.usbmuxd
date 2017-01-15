var Emitter         = require('events').EventEmitter,
    assign          = require('lodash').assign,
    project         = require('../package'),
    usbmuxd         = require('./core/usbmuxd'),
    Lockdownd       = require('./core/lockdownd'),
    Inspector       = require('./core/Inspector'),
    noop            = function () {},
    proto;


proto = module.exports = createApplication;

proto.Lockdownd = Lockdownd;
proto.Inspector = Inspector;

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

    usbmuxd.listen(json, (function (json) {
      this.emit(json.type, json.data, json.socket);
    }).bind(this));

    return this;
  }
}

// Connection.prototype = {
//     __proto__: Events.prototype,
//
//
//
//     dispatch: function(action) {
//         var handle = this['on' + action.messageType];
//
//         handle = handle || this['on' + action.type];
//
//         if (typeof handle == 'function') {
//             handle.apply(this, arguments);
//         }
//     },
//
//     communicate: function(plist, type, binry) {
//         var socket,
//             that = this;
//
//         socket = net.connect(this.address);
//
//         socket.on('data', function (res) {
//             var results = that.dataFormatter(res, binry);
//
//             results.forEach(function(res) {
//                 that.dispatch({
//                     messageType: res.MessageType,
//                     type: type,
//                     data: res
//                 });
//             });
//         });
//
//         if (!Array.isArray(plist)) {
//             plist = [plist];
//         }
//
//         plist.forEach(function(plist) {
//             socket.write(plist);
//         });
//
//         return socket;
//     },
//
//     connect: function (id, port, callback) {
//         var port = port || 62078,
//             plist = this.plist(this.messageType('Connect', {
//                 DeviceID: id,
//                 PortNumber: ((port & 0xFF) << 8) | ((port >> 8) & 0xFF)
//             })),
//             socket;
//
//
//         callback = callback || noop;
//
//         socket = this.communicate(plist, 'Connect');
//
//         this.on('connected', function (res) {
//             callback(res, socket);
//
//             socket.removeAllListeners();
//         });
//
//         return this;
//     },
//
//     record: function (type, serial, callback) {
//         var plist = this.plist(this.messageType(type, {
//                 PairRecordID: serial,
//             })),
//             socket;
//
//         callback = callback || noop;
//
//         socket = this.communicate(plist, 'Record');
//
//         this.on('record', function (res) {
//             callback(res);
//         });
//     },
//
//     buid: function (callback) {
//         var plist = this.plist(this.messageType('ReadBUID'));
//
//         socket = this.communicate(plist, 'Buid');
//
//         this.on('buid', function (res) {
//             callback(res);
//         });
//     },
//
//     session: function (json, socket, callback) {
//         var bplist = this.create(json),
//             that   = this,
//             socket;
//
//         callback = callback || noop;
//
//         socket.write(bufferpack.pack('L', [bplist.length]));
//         socket.write(bplist);
//
//         socket.on('data', this.dataBinryPlistFormatter(function (res) {
//           debugger;
//              var results = that.dataFormatter(res);
//
//             results.forEach(function(res) {
//                 that.dispatch({
//                     messageType: res.MessageType,
//                     type: 'Session',
//                     data: res
//                 });
//             });
//         }));
//
//         this.on('session', function (res) {
//             callback(res);
//         });
//     },
//
//     service: function (json, socket, callback) {
//         var bplist = this.create(json),
//             that   = this,
//             socket;
//
//         callback = callback || noop;
//
//         socket.write(bufferpack.pack('L', [bplist.length]));
//         socket.write(bplist);
//
//         socket.on('data', this.dataBinryPlistFormatter(function (res) {
//              var results = that.dataFormatter(res);
//
//             results.forEach(function(res) {
//                 that.dispatch({
//                     messageType: res.MessageType,
//                     type: 'Service',
//                     data: res
//                 });
//             });
//         }));
//
//         this.on('Service', function (res) {
//             callback(res);
//         });
//     },
//
//     listen: function() {
//         var plist = this.plist(this.messageType('Listen')),
//             socket;
//
//         socket = this.communicate(plist, 'Listen');
//
//         this.on('attached', function (device) {
//             var first = this.stack[0];
//
//             this.stack[0] = function (next) {
//                 first({
//                     device: device
//                 }, next);
//             }
//
//             this.waterfall(this.stack, function () {
//
//             });
//         });
//
//         return this;
//     },
//
//     onAttached: function(res) {
//         var data    = res.data,
//             device  = _.assign(data.Properties);
//
//         this.devices.push(device);
//
//         this.emit('attached', device);
//     },
//
//     onSession: function (res) {
//         var data = res.data;
//
//         this.emit('session', {
//             SessionID: data.SessionID,
//             EnableSessionSSL: data.EnableSessionSSL
//         })
//     },
//
//     onRecord: function (res) {
//         var data = res.data,
//             record;
//
//         if (data.PairRecordData) {
//             record = this.parse(data.PairRecordData);
//         }
//
//         this.emit('record', record);
//     },
//
//     onBuid: function (res) {
//         var data = res.data;
//
//         this.emit('buid', data.BUID);
//     },
//
//     onResult: function (res) {
//         var data    = res.data,
//             type    = res.type;
//
//         if (data.Number === 0) {
//             return this.dispatch({
//                 messageType: type,
//                 data: data
//             });
//         }
//
//         if (typeof this.onError == 'function') {
//             this.onError(type || data.MessageType, this.errors[data.Number] || 'unknown');
//         }
//     },
//
//     onError: function (type, message) {
//         var error = new Error(type + ', ' + message);
//
//         this.emit('error',error);
//     },
//
//     onConnect: function (res) {
//         this.emit('connected', res.data);
//     },
//
//     onDetached: function(res) {
//         var data = res.data,
//             properties = data.Properties || {},
//             index,
//             device;
//
//         if (this.devices.some(function(device, i) {
//             if (device.SerialNumber == properties.SerialNumber) {
//                 index = i;
//                 return true;
//             }
//         })) {
//             device = this.devices[index];
//
//             this.devices.splice(index, 1);
//         }
//
//         this.emit('detached', device);
//     }
// }
