/*global console*/
var yetify = require('yetify'),
    config = require('getconfig'),
    fs = require('fs'),
    sockets = require('./sockets'),
    port = parseInt(process.env.PORT || config.server.port, 10),
    server_handler = function (req, res) {
        res.writeHead(404);
        res.end();
    },
    server = null;

// Create an http(s) server instance to that socket.io can listen to
if (config.server.secure) {
	/*
    server = require('https').Server({
        key: fs.readFileSync(config.server.key),
        cert: fs.readFileSync(config.server.cert),
        passphrase: config.server.password
    }, server_handler);
	*/
    server = require('https').Server({
		key: fs.readFileSync(__dirname+'/jssl.key'),
		cert: fs.readFileSync(__dirname+'/1_superlucky.co.kr_bundle.crt')
    }, server_handler);
	/*

  var https = require('https');
  var httpsOption = { 
    key: fs.readFileSync(__dirname+'/jssl.key'),
    cert: fs.readFileSync(__dirname+'/1_superlucky.co.kr_bundle.crt')
  }

  server = https.createServer(httpsOption, app).listen(443, function(){
    console.log("Https server listening on port " + 443);
  });
  */

} else {
server = require('http').Server(server_handler);
}
server.listen(port);

sockets(server, config);

if (config.uid) process.setuid(config.uid);

var httpUrl;
if (config.server.secure) {
    httpUrl = "https://localhost:" + port;
} else {
    httpUrl = "http://localhost:" + port;
}
console.log(yetify.logo() + ' -- signal master is running at: ' + httpUrl);
