var inspector = require('../libs/service/inspector'),
    enableTable;
  
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

inspector.start(function (bundleManager) {
  var task = bundleManager.watch('com.apple.WebKit.WebContent');

  task.ready(function (pages) {
    var page;

    debugger;

    page = task.inspect(pages.pop());

    page.command(enableTable);
    page.command('Timeline.setInstruments', {
      instruments: [
        'Timeline',
        'ScriptProfiler'
      ]
    });
    page.command('Debugger.setPauseOnException', {
      state: 'none'
    });
    page.command('Page.setShowPaintRects', {
      result: 'true'
    });
    page.command('Runtime.evaluate', {
      expression: 'alert(\'Hello! This is Aniwei Studio\')'
    });

    page.message(function (data) {
      console.log(data)
    });
  });

  task.close(function (pages) {

  });
});


window.inspector = inspector;