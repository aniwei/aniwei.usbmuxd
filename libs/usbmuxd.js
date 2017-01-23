var project = require('../package'),
    net     = require('net'),
    plist       = require('plist'),
    _           = require('lodash'),
    Events      = require('events').EventEmitter,
    async       = require('async'),
    bufferpack  = require('bufferpack'),
    creater     = require('bplist-creator'),
    parser      = require('bplist-parser'),
    noop        = function () {},
    proto;


proto = module.exports = createApplication;

function createApplication () {
    return new Relay();
}

function Connection() {}

Events.prototype.__proto__ = async;

Connection.prototype = {
    __proto__: Events.prototype,
    errors: {
        '2': 'iOS Devices is not connected',
        '3': 'Port is not available or open',
        '5': 'Malformed Request'
    },

    // /var/run/usbmuxd
    address: process.platform == 'win32' ? { port: 27015 } : { path: '/var/run/usbmuxd' },

    length: 16,

    dataFormatter: function(data) {
        var length,
            content,
            that,
            res

        length = data.readUInt32LE(0) - this.length;
        data = data.slice(this.length);
        content = data.slice(0, length);
        data = data.slice(length);
        res = [plist.parse(content.toString())];
        that = this;

        if (data.length > 0) {
            res = res.concat(this.dataFormatter(data));
        }

        return res;
    },

    dispatch: function(action) {
        var handle = this['on' + action.messageType];

        handle = handle || this['on' + action.type];

        if (typeof handle == 'function') {
            handle.apply(this, arguments);
        }
    },

    messageType: function(type, others) {
        var proto = {
            ClientVersionString: project.name,
            ProgName: project.name,
            BundleID: project.originzation
        }

        this.messageType = function(type, others) {
            return _.assign({
                MessageType: type
            }, proto, others);
        }

        return this.messageType(type, others);
    },

    plist: function(json) {
        var content = new Buffer(plist.build(json)),
            header = new Buffer(16);

        // 从offset 0开始写入头部
        // https://www.theiphonewiki.com/wiki/Usbmux
        // 写入数据大小 
        header.writeUInt32LE(content.length + this.length);

        // 写入版本
        header.writeUInt32LE(1, 4);

        // rcg4u/iphonessh
        header.writeUInt32LE(8, 8);

        //
        header.writeUInt32LE(1, 12);

        return Buffer.concat([header, content]);
    },

    communicate: function(addr, plist, type) {
        var socket,
            that = this;

        socket = net.connect(addr);

        socket.on('data', function (res) {
            var results = that.dataFormatter(res);

            results.forEach(function(res) {
                that.dispatch({
                    messageType: res.MessageType,
                    type: type,
                    data: res
                });
            });
        });

        if (!Array.isArray(plist)) {
            plist = [plist];
        }

        plist.forEach(function(plist) {
            socket.write(plist);
        });

        return socket;
    },

    connect: function (id, port, callback) {
        var port = port || 62078,
            plist = this.plist(this.messageType('Connect', {
                DeviceID: id,
                PortNumber: ((port & 0xFF) << 8) | ((port >> 8) & 0xFF)
            })),
            socket;

        callback = callback || noop;

        socket = this.communicate(this.address, plist, 'Connect');

        this.on('connected', function (res) {
            callback(res)
        });

        return this;
    },

    record: function (type, serial, callback) {
        var plist = this.plist(this.messageType(type, {
                PairRecordID: serial,
            })),
            socket;

        callback = callback || noop;

        socket = this.communicate(this.address, plist, 'Record');
        

        this.on('record', function (res) {
            callback(res, socket)
        });
    },

    buid: function (callback) {
        var plist = this.plist(this.messageType('ReadBUID'));

        socket = this.communicate(this.address, plist, 'Buid');

        this.on('buid', function (res) {
            callback(res);
        });
    },

    session: function (json, socket, callback) {
        var plist = this.plist({
            Request: 'QueryType'
        }),
            socket;

        callback = callback || noop;

        console.log(plist.toString())

        //socket.write(bufferpack.pack('L', [plist.length]));
        socket.write(plist);
        
        this.on('record', function (res) {
            callback(res, socket)
        });
    },

    listen: function() {
        var plist = this.plist(this.messageType('Listen')),
            socket;

        socket = this.communicate(this.address, plist, 'Listen');

        this.on('attached', function (device) {
            var first = this.stack[0];

            this.stack[0] = function (next) {
                first(device, next);
            }

            this.waterfall(this.stack, function () {

            });
        });

        return this;
    },

    onAttached: function(res) {
        var data    = res.data,
            device  = _.assign(data.Properties);

        this.devices.push(device);

        this.emit('attached', device);
    },

    onRecord: function (res) {
        var data = res.data,
            record;

        if (data.PairRecordData) {
            try {
                record = plist.parse(data.PairRecordData.toString());
            } catch (Error) {
                record = parser.parseBuffer(data.PairRecordData.toString())
            }
            
        }

        this.emit('record', record);
    },

    onBuid: function (res) {
        var data = res.data;
    
        this.emit('buid', data.BUID);
    },

    onResult: function (res) {
        var data    = res.data,
            type    = res.type,
            handle;

        if (data.Number === 0) {
            return this.dispatch({
                messageType: type,
                data: data
            });
        }

        throw new Error(data.Number)
    },

    onConnect: function (res) {
        this.emit('connected', res.data);
    },

    onDetached: function(res) {
        var data = res.data,
            properties = data.Properties || {},
            index,
            device;

        if (this.devices.some(function(device, i) {
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
}


function Relay() {
    this.devices    = [];
    this.stack      = [];
}

Relay.prototype = {
    __proto__: Connection.prototype,
    use: function (callback) {
        if (typeof callback == 'function') {
            this.stack.push(callback);
        }

        return this;
    }
};