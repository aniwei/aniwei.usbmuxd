var inspector = require('../libs/service/inspector');

inspector.start(function (bundleManager) {
  var bundle = bundleManager.get('com.apple.WebKit.WebContent'),
      page;

  if (bundle) {
    page = bundle.get('page');

    if (page.length > 0) {
      page = page.shift();

      console.log(page.get('sender'));

      page.startSession(function (page) {
        page.command({
          method: 'Runtime.evaluate',
          params: {
            'expression': '\n//# sourceURL=__WebInspectorConsoleEvaluation__\nalert(1222)',
            'objectGroup': 'console',
            'includeCommandLineAPI': true,
            'doNotPauseOnExceptionsAndMuteConsole': false,
            'returnByValue': false,
            'generatePreview': true,
            'saveResult': true
          }
        });
      });
    }
  }
});
