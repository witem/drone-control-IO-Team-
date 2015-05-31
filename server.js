var http = require("http");
    // drone = require('');
var Primus = require('primus')
var port = 1313;
var os = require('os');

var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}

var server = http.createServer(function(req, res) {
  require("fs").createReadStream(__dirname + "/index.html").pipe(res);
});

var primus = new Primus(server, { transformer: 'socket.io' });

primus.on('connection', function(socket) {
  socket.on('data', function(data) {
    console.log('WS_DATA',data)
    // body...
  })
})
// drone.listen(server);
server.listen(port);
console.log("Server run", addresses, port)