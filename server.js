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
//Socket.io will call this function when a client connects,
//So we can send that client looking for a game to play,
//as well as give that client a unique ID to use so we can
//maintain the list if players.
sio.on('connection', function(socketClient) {
  // console.log(socketClient);
  socketClient.userid = UUID();
  socketClient.emit('onconnected', {id: socketClient.userid });
  let currGame = new global.gameCore({
    server: true
  });
  currGame.start();

  gameServer.findGame(socketClient);
  
  socketClient.on('message', function(message) {
    console.log(message, socketClient.userid);
  });
});
// sio.sockets.on('connection', function (client) {
//   //Generate a new UUID, looks something like
//   //5b2ca132-64bd-4513-99da-90e838ca47d1
//   //and store this on their socket/connection
//   client.userid = UUID();
//   //tell the player they connected, giving them their id
//   client.emit('onconnected', { id: client.userid } );
//   //now we can find them a game to play with someone.
//   //if no game exists with someone waiting, they create one and wait.
//   //game_server.findGame(client);
//   //Useful to know when someone connects
//   console.log('\t socket.io:: player ' + client.userid + ' connected');
//   //Now we want to handle some of the messages that clients will send.
//   //They send messages here, and we send them to the game_server to handle.
//   client.on('message', function(m) {
//     game_server.onMessage(client, m);
//   }); //client.on message
//   //When this client disconnects, we want to tell the game server
//   //about that as well, so it can remove them from the game they are
//   //in, and make sure the other player knows that they left and so on.
//   client.on('disconnect', function () {
//     //Useful to know when soomeone disconnects
//     console.log('\t socket.io:: client disconnected ' + client.userid + ' ' + client.game_id);
//     //If the client was in a game, set by game_server.findGame,
//     //we can tell the game server to update that game state.
//     if(client.game && client.game.id) {
//       //player leaving a game should destroy that game
//       game_server.endGame(client.game.id, client.userid);
//     }
//   });
// });
