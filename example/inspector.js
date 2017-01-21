var inspector = require('../libs/service/inspector');

inspector.start(function (socket) {
  inspector.connect(function (bundleTable) {
    var bundle = bundleTable['com.apple.WebKit.WebContent'];

    if (bundle) {
      if (bundle.pageTable.length > 0) {
        bundle.page = bundle.pageTable.pop();

        inspector.startSession(bundle, function () {
          this.command({
            method: 'Debugger.causesRecompilation',
            params: {
              'expression': 'alert("Hello")',
              'objectGroup': 'console',
              'includeCommandLineAPI': true,
              'doNotPauseOnExceptionsAndMuteConsole': true,
              'returnByValue': false
            }
          });
        });
      }
    }
  });
});
