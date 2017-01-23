var colors = require('colors');

module.exports = {
  isPrint: true,
  isDetail: false,
  print: function (level, message, content) {
    var log;

    if (!this.isPrint) {
      return this;
    }
    
    log = level + ' : ' + message;
    
    console.log(log.green);

    if (this.isDetail) {
      if (content) {
        console.log(content.white);
      }
    }
  }
}