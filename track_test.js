var http = require('http');
var fs   = require('fs');

var port = 1313

var server = http.createServer(function(req, res) {
  var url = req.url;
  switch (true) {
    case url=="/" :
      fs.createReadStream(__dirname + "/track.html").pipe(res);
      break;
    case url=="/build/tracking-min.js" :
      fs.createReadStream(__dirname + "/build/tracking-min.js").pipe(res);
      break;
    default : 
      res.end('404 | Huj tobi!')
      break;
  }
  // fs.createReadStream(__dirname + "/index2.html").pipe(res);
});
server.listen(port);
console.log("Server run, port", port)