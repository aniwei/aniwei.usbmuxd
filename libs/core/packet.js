var receiver  = require('./receiver'),
    net       = require('net'),
    isWin32   = process.platform == 'win32',
    formatter = require('./formatter'),
    address   = isWin32 ? { port: 27015 } : { path: '/var/run/usbmuxd' },
    map;

function packet (plist, socket, type, callback) {
  if (typeof socket == 'function') {
    callback = socket;
    socket   = undefined;
    type     = 'xml';
  }

  if (typeof type == 'function') {
    callback = type;
    type     = undefined;

    if (typeof socket == 'string') {
      type   = socket;
      socket = undefined;
    }
  }

  if (!socket) {
    socket = net.connect(address);
  }

  type = type || 'xml';

  socket.removeAllListeners();

  socket.on('data', receiver.receive(type, function (res) {
    callback(res);
  }));

  if (!Array.isArray(plist.data)) {
    plist.data = [plist.data];
  }

  plist.data.forEach(function (plist) {
    socket.write(plist);
  });

  return socket;
}

module.exports = packet
