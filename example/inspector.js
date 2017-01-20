var inspector = require('../libs/service/inspector');

inspector.start(function (socket) {
  inspector.connect(function (apps) {
    if (!this.rpc.setuped) {
      this.startSession(apps.Safari, 1, function () {
        this.command({
          method: 'Debugger.causesRecompilation'
        });
      });
    }
  });
});
