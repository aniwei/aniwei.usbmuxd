var uuid    = require('uuid');

module.exports = function (name, key) {
  return new Bundle(name, key);
}

function Bundle (name, key) {
  this.name       = name;
  this.key        = key;
  this.sender     = uuid.v4();
  this.pageTable  = [];
  this.page       = null;
  this.connected  = false;
}

Bundle.prototype = {
  __proto__: 1,

  select: function (index) {

  }
}
