let gameServer = module.exports = { games: {}, games_count: 0 };
const UUID = require('node-uuid');
const VERBOSE = true;

//global.window = global.document = global;
require('./game-core.js');

gameServer.log = function() {
  if(VERBOSE) console.log.apply(this, arguments);
};

gameServer.fake_latency = 0;
gameServer.game_count = 0;
gameServer.local_time = 0;
gameServer._dt = new Date().getTime();
gameServer._dte = new Date().getTime();
//a local queue of messages we delay if faking latency
gameServer.messages = [];

setInterval(function(){
  gameServer._dt = new Date().getTime() - gameServer._dte;
  gameServer._dte = new Date().getTime();
  gameServer.local_time += gameServer._dt/1000.0;
}, 4);

gameServer.onMessage = (client, message) => {
  if(message.split('.')[0].substr(0,1) === 'i') {
    gameServer.messages.push({
      client,
      message
    });
    //setTimeout(() => {
    if(gameServer.messages.length > 0) {
      gameServer._onMessage( gameServer.messages[0].client, gameServer.messages[0].message);
      gameServer.messages.splice(0, 1);
    }
    //});
  }
  else {
    gameServer._onMessage(client, message);
  }
}

gameServer._onMessage = (client, message) => {
  let messageParts = message.split('.');
  let messageType = messageParts[0];
  let otherClient = (client.game.player_host.userid === client.userid) ?
    client.game.player_client : client.game.player_host;

  if(messageType === 'i') {
    gameServer.onInput(client, messageParts);
  }
  else if (messageType === 'p') {
    client.send('s.p.' + messageParts[1]);
  }
  else if (messageType === 'c') {
    if(otherClient) {
      otherClient.send('s.c.' + messageParts[1]);
    }
  }
  else if(messageType === 'l') {
    console.log('could set fake latency here as', parseFloat(messageParts[1]));
  }
}

// TODO should find way to broadcast physics prediction to other players
gameServer.onInput = (client, parts) => {
  //client.game.gameCore.players.self.processInputs();
  //let pos = client.game.gameCore.players.self.player.position;
  //let rot = client.game.gameCore.players.self.player.rotation;
  let input_commands = parts[1];
  let input_time = parts[2].replace('-', '.');
  let input_seq = parts[3];
  if(client && client.game && client.game.gameCore) {
    client.game.player_host.game.gameCore.handleServerInput(client, input_commands, input_time, input_seq, true);
  }
  // if(client && client.game && client.game && client.game.player_client) {
  //   client.game.player_client.game.gameCore.handleServerInput(client, input_commands, input_time, input_seq, false);
  // }
}

gameServer.createGame = (player) => {
  let newGame = {
    id: UUID(),
    player_host: player,
    player_client: null,
    player_count: 1
  };
  gameServer.games[newGame.id] = newGame;
  gameServer.game_count++;
  newGame.gameCore = new gameCore(newGame);
  newGame.gameCore.start();
  newGame.gameCore.update( new Date().getTime());
  newGame.gameCore.players.self.instance =  player;
  player.send('s.h.' + String(newGame.gameCore.local_time).replace('.', '-'));
  console.log('server host at  ' + newGame.gameCore.local_time);
  player.game = newGame;
  player.hosting = true;
  gameServer.log('player ' + player.userid + ' created a game with id ' + player.game.id);
  return newGame;
}

gameServer.endGame = (gameid, userid) => {
  let currGame = gameServer.games[gameid];
  if(currGame) {
    currGame.gameCore.stopUpdate();
    if(currGame.player_count > 1) {
      if(userid === currGame.player_host.userid) {
        if(currGame.player_client) {
          currGame.player_client.send('s.e');
          gameServer.findGame(currGame.player_client);
        }
      }
      else {
        if(currGame.player_host) {
          currGame.player_host.send('s.e');
          currGame.player_host.hosting = false;
          gameServer.findGame(currGame.player_host);
        }
      }
    }
    delete gameServer.games[gameid];
    gameServer.game_count--;
    gameServer.log('game removed. there are now ' + gameServer.game_count + ' games' );
  }
  else {
    gameServer.log('game ' + gameid + ' was not found');
  }
}

gameServer.startGame = (game, index) => {
  game.player_client.send('s.j.' + game.player_host.userid);
  game.player_client.game = game;
  if(index >= 1) {
    game.player_client.send('s.r.' + String(game.gameCore.local_time).replace('.', '-') + '.client');
  }
  else {
    game.player_client.send('s.r.' + String(game.gameCore.local_time).replace('.', '-'));
  }
  game.player_host.send('s.r.'+ String(game.gameCore.local_time).replace('.','-'));
  game.active = true;
}

gameServer.findGame = (player) => {
  gameServer.log('looking for a game. We have : ' + gameServer.game_count);
  if(gameServer.game_count) {
    let joined_a_game = false;
    for(let gameid in gameServer.games) {
      let game_instance = gameServer.games[gameid];
      if(game_instance.player_count < 2) {
        joined_a_game = true;
        game_instance.player_client = player;
        game_instance.gameCore.players.other.player_client = player;
        game_instance.gameCore.players.other.player = player;
        game_instance.player_count++;
        // fixed index to indicate player number
        gameServer.startGame(game_instance, 1);
      }
    }
  }
  else {
    gameServer.createGame(player);
  }
}

