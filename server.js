var gameport = process.env.PORT || 4004;
var io = require('socket.io');
var express = require('express');
var UUID = require('node-uuid');
var http = require('http');
var app = express();
var server = http.createServer(app);

server.listen(gameport);
console.log('\t :: Express :: Listening on port ' + gameport );
