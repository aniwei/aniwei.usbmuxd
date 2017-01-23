var exec = require('child_process').execSync,
    path = require('path'),
    fs   = require('fs'),
    log,
    command,
    ps;

command = 'sudo socat -t100 -x -v UNIX-LISTEN:/var/run/usbmuxd,mode=777,reuseaddr,fork UNIX-CONNECT:/var/run/usbmuxx';
log = path.join(__dirname, 'usbmuxd.txt');

if (!fs.existsSync(log)) {
  fs.writeFileSync(log, '');
}

ps = exec(command, function (err, stdout, stdin) {
  if (err) {
    return console.log(err);
  }

  console.log(stdin);

  fs.appendFile(log, stdin);
});

ps.stdout.on('data', function (data) {
  console.log(data)
});

ps.stdin.on('data', function (data) {
  console.log(data)
});
