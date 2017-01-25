var screenshot = require('../libs/service/screenshot'),
    fs         = require('fs'),
    path       = require('path');

screenshot.start(function () {
  screenshot.take(function (data) {
    var uri = path.join(__dirname, 'screenshot-0-0-0.tiff');

    console.log('截图成功', uri);

    fs.writeFile(uri, data);
  });
});