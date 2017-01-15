var App        = require('./libs/app'),
    app        = App(),
    Lockdownd  = App.Lockdownd,
    Inspector  = App.Inspector;


app.listen();

app.on('attached', function (data) {
  var lockdownd = new Lockdownd({
        id:     data.DeviceID,
        serial: data.Properties.SerialNumber
      });

  lockdownd.startService({
    service: 'com.apple.webinspector'
  }, function (service) {
    lockdownd.connect(service.port, function (socket) {

    })
  });

  lockdownd.on('error', function (mess) {
    console.log(mess);
  });
});

app.on('', function () {

})


// app.use(function (data, next) {
//   var device = data.device;
//
//   app.connect(device.DeviceID, 62078, function (res, socket) {
//     data.socket = socket;
//
//     next(null, data);
//   });
// });
//
// app.use(function (data, next) {
//   var device = data.device;
//
//   app.record('ReadPairRecord', device.SerialNumber, function (record) {
//     data.record = record;
//
//     next(null, data);
//   })
// });
//
// app.use(function (data, next) {
//   app.buid(function (buid) {
//     data.buid = buid;
//
//     next(null, data);
//   })
// });
//
// app.use(function (data, next) {
//   var record = data.record,
//       socket = data.socket;
//
//   app.session({
//     Request: 'StartSession',
//     HostID: record.HostID,
//     SystemBUID: record.SystemBUID
//   }, socket, function (session) {
//     data.session = session;
//
//
//     next(null, data)
//   })
// });
//
// app.use(function (data, next) {
//   var record = data.record,
//       socket = data.socket;
//
//   data.tlsSocket = new tls.TLSSocket(data.socket, {
//     secureContext: tls.createSecureContext({
//       key: record.RootPrivateKey,
//       cert: record.RootCertificate
//     })
//   });
//
//   app.service({
//     Request: 'StartService',
//     Service: 'com.apple.webinspector'
//   }, data.tlsSocket, function () {
//     next(null, data)
//   })
// });
//
// app.on('error', function (err) {
//   console.log(err);
// })
//
// module.exports = app;
