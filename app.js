var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var users = [];
var connections = [];

server.listen(3000);

app.use('/public', express.static(__dirname + '/public'));
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

console.log('Server is running');

io.sockets.on('connection', function(socket) {
  connections.push(socket);
  console.log('User connected, %s sockets connected.', connections.length);

  socket.on('disconnect', function(data) {
    connections.splice(connections.indexOf(socket), 1);
    console.log('User disconnected, %s sockets connected.', connections.length);
  });
});
