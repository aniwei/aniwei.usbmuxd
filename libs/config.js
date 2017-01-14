var isWin32 = process.platform == 'win32';

module.exports = {
  address: isWin32 ? { port: 27015 } : { path: '/var/run/usbmuxd' }
}
