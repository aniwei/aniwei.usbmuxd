var Usbmuxd = require('./libs/usbmuxd'),
    app     = Usbmuxd();


app.use(function (device, next) {
  app.connect(device.DeviceID, 62078, function (res) {
    next(null, device);
  });
});

app.use(function (device, next) {
  debugger;
  app.record('ReadPairRecord', device.SerialNumber, function (record, socket) {
    next(null, device, record, socket);
  })
});

app.use(function (device, record, socket, next) {
  app.buid(function (buid) {
    next(null, record, buid, socket);
  })
});

app.use(function (record, buid, socket, next) {
  app.session({
    Request: 'StartSession',
    HostID: record.HostID,
    SystemBUID: record.SystemBUID
  }, socket, function () {
    debugger;
  })
});

module.exports = app; 


