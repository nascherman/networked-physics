var gameport = process.env.PORT || 4004;
var express = require('express');
var UUID = require('node-uuid');
// Requires for server rendering
let MockBrowser = require('mock-browser').mocks.MockBrowser;
window = MockBrowser.createWindow();
document = MockBrowser.createDocument();
// global.Worker = require('webworker-threads').Worker;
global.getComputedStyle = document.defaultView.getComputedStyle;

global.isServer = true;

var app = require('express')();
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var server = require('http').Server(app);
var sio = require('socket.io')(server);
server.listen(gameport);
gameServer = require('./game-server.js');

sio.on('connection', function(socketClient) {
  // console.log(socketClient);
  socketClient.userid = UUID();
  socketClient.emit('onconnected', {id: socketClient.userid });

  gameServer.findGame(socketClient);
  
  socketClient.on('message', function(message) {
    gameServer.onMessage(socketClient, message);
  });

  socketClient.on('disconnect', function() {
    console.log('\t socket.io:: client disconnected ' + socketClient.userid + ' ' + socketClient.game_id);
    if(socketClient.game && socketClient.game.id) {
      gameServer.endGame(socketClient.game.id, socketClient.userid);
    }
  })
});
