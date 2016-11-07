var project = require('../package'),
    net     = require('net'),
    plist   = require('plist'),
    _       = require('lodash'),
    Events  = require('events').EventEmitter,
    proto;


proto = module.exports = function () {
  return new Relay();
}

function Connection () {
  this.isConnect = false;
}

Connection.prototype = _.assign({
  __proto__: Events.prototype,
  errors: {
    '2': 'iOS Devices is not connected',
    '3': 'Port is not available or open',
    '5': 'Malformed Request'
  },
  
  // /var/run/usbmuxd
  address: process.platform == 'win32' ?
    {port: 27015} : {path: '/var/run/usbmuxd'},

  headerLength: 16,

  client: {
    MessageType: 'Listen',
    ClientVersionString: project.name,
    ProgName: project.name
  },

  protocolBuilder: function (param) {
    return this.contentBuilder(_.assign(param || {}, {
      ClientVersionString: project.name,
      ProgName: project.name
    }));
  },

  contentBuilder: function (json) {
    var jsonBuffer    = new Buffer(plist.build(json)),
        headerBuffer  = new Buffer(16);

    // 从offset 0开始写入头部
    // https://www.theiphonewiki.com/wiki/Usbmux
    // 写入数据大小 
    headerBuffer.writeUInt32LE(jsonBuffer.length + this.headerLength);

    // 写入版本
    headerBuffer.writeUInt32LE(1, 4);

    // rcg4u/iphonessh
    headerBuffer.writeUInt32LE(8, 8);

    //
    headerBuffer.writeUInt32LE(1, 12);
   
    return Buffer.concat([headerBuffer, jsonBuffer]);
  },

  dataFormatter: function (data) {
    var length,
        content,
        res

    length  = data.readUInt32LE(0) - this.headerLength;
    data    = data.slice(this.headerLength);
    content = data.slice(0, length);
    data    = data.slice(length);

    res = [plist.parse(content.toString())];

    if (data.length > 0) {
      res = res.concat(this.dataFormatter(data));
    } 
    
    return res;
  },

  dispatch: function (action) {
    var handle = this['on' + action.type];

    if (typeof handle == 'function') {
      handle.apply(this, arguments);
    }
  },

  connect: function (plist) {
    var content = this.protocolBuilder(plist || this.client),
        that    = this,
        socket;

    socket  = net.connect(this.address, function () {
      socket.write(content);
    });
      
    socket.on('data', function (data) {
      var res = that.dataFormatter(data) || [];

      if (res.length > 0) {
        res.forEach(function (res, i) {
          var type = (res.MessageType || '').replace(/\w/, function ($1) {
            return $1.toUpperCase()
          });

          that.dispatch({
            type: type,
            data: res
          });        
        });
      }
    });

    return this;
  },

  onResult: function (res) {
    var data = res.data,
        err;

    if (data.Number) {
      err = this.errors[data.Number] || 'Unknown Error';
    }

    if (err) {
      throw err;
    }

    this.emit('connection');
  }
});

function Relay () {
  this.devices    = [];
}

Relay.prototype = _.assign({
  __proto__: Connection.prototype,

  onAttached: function (res) {
    var data        = res.data,
        properties  = data.Properties || {},
        device      = new Device(properties);

    this.devices.push(device);

    this.emit('attached', device);
  },

  onDetached: function (res) {
     var data        = res.data,
         properties  = data.Properties || {},
         index,
         device;

    if (this.devices.some(function (device, i) {
      if (device.SerialNumber == properties.SerialNumber) {
        index = i;
        return true;
      }
    })) {
      device = this.devices[index];

      this.devices.splice(index, 1);
    }

    this.emit('detached', device);
  }
});

function Device (properties) {
  _.assign(this, properties);
}

Device.prototype = _.assign({
  __proto__: Connection.prototype,
  connect: function (port) {
    port = port || 22;

    return Connection.prototype.connect.call(this, {
      ClientVersionString: project.name,
      ProgName: project.name,
      MessageType: 'Connect',
      DeviceID: this.DeviceID,
      PortNumber: ((port & 0xFF) << 8) | ((port >> 8) & 0xFF)
    });
  },

  protocolBuilder: function (param) {
    return this.contentBuilder(param);
  },

  request: function (payload) {
    return Connection.prototype.connect.call(this, {
      __selector: '_rpc_reportIdentifier:',
      __argument: {
        WIRConnectionIdentifierKey: '3b417e9a-9635-4059-a63e-ca88c98744bf'
      }
    });
  }
});
