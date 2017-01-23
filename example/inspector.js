var inspector = require('../libs/service/inspector');

inspector.start(function (bundleManager) {
  var bundle = bundleManager.get('com.apple.WebKit.WebContent'),
      page;

  if (!bundle) {
    return this;
  }

  bundle.listing(function (pages) {
    var page = pages.get('page').pop();

    if (!page) {
      return this;
    }

    page.startSession(function (page) {
      var enableTable;

      enableTable = [
        'inspector.enable',
        'CSS.getSupportedCSSProperties',
        'CSS.getSupportedSystemFontFamilyNames',
        'Page.enable',
        'Network.enable',
        'Page.getResourceTree',
        'DOMStorage.enable',
        'Database.enable',
        'IndexedDB.enable',
        'CSS.enable',
        'Runtime.enable',
        'Heap.enable',
        'Memory.enable',
        'ApplicationCache.enable',
        'ApplicationCache.getFramesWithManifests',
        'Debugger.enable',
        'LayerTree.enable',
        'Console.enable',
        'Inspector.initialized'
      ].map(function (method) {
        return {
          method: method
        }
      });

      page.command(enableTable);
      page.command({
        method: 'Timeline.setInstruments',
        params: {
          instruments: [
            'Timeline',
            'ScriptProfiler'
          ]
        }
      });
      page.command({
        method: 'Debugger.setPauseOnExceptio',
        params: {
          state: 'none'
        }
      });
      page.command({
        method: 'Page.setShowPaintRects',
        params: {
          result: 'true'
        }
      });
      page.command({
        method: 'Runtime.evaluate',
        params: {
          'expression': '\n//# sourceURL=__WebInspectorConsoleEvaluation__\nalert(\'Hello World!\n Created by aniwei\')',
          'objectGroup': 'console',
          'includeCommandLineAPI': true,
          'doNotPauseOnExceptionsAndMuteConsole': false,
          'returnByValue': false,
          'generatePreview': true,
          'saveResult': true
        }
      });

      //Debugger.setBreakpintByUrl
      //lineNumber,url,columnNumber,condition,options,codition,ignoreCount,actions,autoContinue

      window.page = page;
    });
  });
});
