'use strict';
global.THREE = require('three');
var io = require('socket.io-client');
var THREE = global.THREE;
var Physijs = require('./libs/physi.js');

// const NO_STATS = false;

if(!global.isServer) {
  var loader = new THREE.TextureLoader();
  var Stats = require('stats-js');
  var stats = new Stats();
  stats.setMode(2);
} 

var createScene = require('scene-template');
var createLoop = require('raf-loop');
var GamePlayer = require('./GamePlayer');
var createBox = require('./createObj').createBox;
var createSphere = require('./createObj').createSphere;

const PLANE_DEPTH = 25;
const PLANE_WIDTH = 25;
const SPACING = 3;
const MARGIN = 2.5;
const GRID_SIZE = 1;
const SEGMENTS = 10;
const PHYSICS_FRAMERATE = 1000 / 60;

const SERVER_URL = 'http://localhost';
const SERVER_PORT = 4004;

global.keys = [];

function gameCore(opts) {
  Object.assign(this, opts);
  this.server = this.instance !== undefined;
  this.grid = [];
}

gameCore.prototype.initGrid = function(scene) {
  for(var i = -PLANE_WIDTH/2 + MARGIN; i < PLANE_WIDTH/2; i += SPACING) {
    for(var j = -PLANE_DEPTH/2 + MARGIN; j < PLANE_DEPTH/2; j += SPACING) {
      this.grid.push(createBox({
        x: i,
        y: 3,
        z: j,
        depth: GRID_SIZE,
        width: GRID_SIZE,
        height: GRID_SIZE,
        mass: 0.01
      }, scene));
    }
  }
};

gameCore.prototype.initScene = function() {
  var scene = new Physijs.Scene('./libs/physi-worker.js');
  var ambient = new THREE.AmbientLight(0xffffff, 1.5);

  var opts = {
    renderer: {
      antialias: true,
    },
    scene: scene,
    controls: {
      theta: 0 * Math.PI / 180,
      phi: -55 * Math.PI / 180,
      distance: 40,
      type: 'orbit'
    },
    camera: {
      far: 100000
    },
    object: [
      ambient
    ]
  };
  if(global.isServer) opts.renderer.context = require('gl')(100, 100);
  // Create our basic ThreeJS application
  if(!global.isServer) {
    var {
      renderer,
      camera,
      updateControls
    } = createScene(opts, THREE);  
  } 
  else {
    var {
      renderer,
      camera,
    } = createServerScene(opts, THREE);
  }
  
  console.log("CREATED")
  this.renderer = renderer;
  this.camera = camera;
  this.scene = scene;
  this.updateControls = updateControls;

  renderer.shadowMap.enabled = true;
  renderer.shadowMapSoft = true;
  window.scene = scene;
  // camera.add(light);
  renderer.setClearColor(0xffffff);
  
  let floorMaterial;
  if(global.isServer) {
    floorMaterial = new THREE.MeshBasicMaterial({});
  }
  else {
    floorMaterial = new THREE.MeshLambertMaterial({ map: loader.load('/assets/lush-grass.jpg') });
    floorMaterial.map.wrapS = floorMaterial.map.wrapT = THREE.RepeatWrapping;
    floorMaterial.map.repeat.set(2.5,2.5);
  }
    // 0.4, //high friction
    // 0.1 //low restitution
  
  var ground = new Physijs.Box(
    new THREE.BoxGeometry(PLANE_WIDTH, 1, PLANE_DEPTH),
    floorMaterial,
    {
      friction: 1,
      restitution: 0.00001,
      mass:0.0
    }
  );

  ground.physics.collision_groups = 1;

  var light = new THREE.SpotLight( 0xFFFFFF );
  light.intensity = 1.5;
  light.position.set( 20, 40, -15 );
  light.target.position.copy( scene.position );

  this.initGrid(scene);
  // todo update grid to network positions
  // this.updateGrid();
  scene.add(ground);
  scene.add(light);
};

gameCore.prototype.start = function() {
  if(stats && !global.isServer) {
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px'; 
    document.body.appendChild( stats.domElement );
  }
  
  if(!global.isServer) {
    window.addEventListener('keydown', (e) => {
      keys[e.keyCode] = true;
    });
  
    window.addEventListener('keyup', (e) => {
      keys[e.keyCode] = false;
    });  
  }

  this.initScene();
  let { scene ,renderer, camera, updateControls } = this;
  // two players for now
  let index = 0;
  if(!this.server && !global.isServer) {
    this.players = {
      self: new GamePlayer(Object.assign(this, {
        scene, 
        renderer, 
        camera, 
        index
      }), undefined),
      other: new GamePlayer(Object.assign(this, {
        scene, 
        renderer, 
        camera, 
        index: ++index
      }), undefined)
    };  
    this.ghosts = {
      server_pos_self: new GamePlayer(Object.assign(this, {
        scene, 
        renderer, 
        camera, 
        index,
        visible: false
      }), undefined),
      server_pos_other: new GamePlayer(Object.assign(this, {
        scene, 
        renderer, 
        camera, 
        index,
        visible: false
      }), undefined),
      pos_other: new GamePlayer(Object.assign(this, {
        scene, 
        renderer, 
        camera, 
        index,
        visible: false
      }), undefined)
    }
  }
  else {
    this.players = {
      self: new GamePlayer(Object.assign(this,  {
        scene, 
        renderer, 
        camera, 
        index
      }), undefined), //this.instance.player_host)
      other: new GamePlayer(Object.assign(this, {
        scene, 
        renderer, 
        camera, 
        index: ++index
      }), undefined)//this.instance.player_client)
    };  
  }
  // physics integration value
  this._pdt = 0.0001;                 //The physics update delta time
  this._pdte = new Date().getTime();  //The physics update last delta time
  //A local timer for precision on server and client
  this.local_time = 0.016;            //The local timer
  this._dt = new Date().getTime();    //The local timer delta
  this._dte = new Date().getTime();   //The local timer last frame time

  this.createPhysicsSimulation();
  this.createTimer();
  console.log('done starting game');
  if(!this.server && !global.isServer) {
    //TODO define these functions
    this.clientCreateConfiguration();
    this.server_updates = [];
    this.clientConnectToServer();
    this.clientCreatePingTimer();

    /* TODO set color with local storage here eg - maybe also create debug ui
      this.color = localStorage.getItem('color') || '#cc8822' ;
      localStorage.setItem('color', this.color);
      this.players.self.color = this.color;
    */
  }
  else {
    this.server_time = 0;
    this.lastState = {};
  }
};

gameCore.prototype.stopUpdate = function() {
  this.renderer.domElement.addEventListener('dblclick', null, false); //remove listener to render
  this.scene.physijs.worker.terminate();
  this.scene = null;
  this.camera = null;
}

gameCore.prototype.clientCreateConfiguration = function() {
  this.show_help = false;             //Whether or not to draw the help text
  this.naive_approach = false;        //Whether or not to use the naive approach
  this.show_server_pos = false;       //Whether or not to show the server position
  this.show_dest_pos = false;         //Whether or not to show the interpolation goal
  this.client_predict = true;         //Whether or not the client is predicting input
  this.input_seq = 0;                 //When predicting client inputs, we store the last input as a sequence number
  this.client_smoothing = true;       //Whether or not the client side prediction tries to smooth things out
  this.client_smooth = 25;            //amount of smoothing to apply to client update dest
  this.net_latency = 0.001;           //the latency between the client and the server (ping/2)
  this.net_ping = 0.001;              //The round trip time from here to the server,and back
  this.last_ping_time = 0.001;        //The time we last sent a ping
  this.fake_lag = 0;                //If we are simulating lag, this applies only to the input client (not others)
  this.fake_lag_time = 0;
  this.net_offset = 100;              //100 ms latency between server and client interpolation for other clients
  this.buffer_size = 2;               //The size of the server history to keep for rewinding/interpolating.
  this.target_time = 0.01;            //the time where we want to be in the server timeline
  this.oldest_tick = 0.01;            //the last time tick we have available in the buffer
  this.client_time = 0.01;            //Our local 'clock' based on server time - client interpolation(net_offset).
  this.server_time = 0.01;            //The time the server reported it was at, last we heard from it
  this.dt = 0.016;                    //The time that the last frame took to run
  this.fps = 0;                       //The current instantaneous fps (1/this.dt)
  this.fps_avg_count = 0;             //The number of samples we have taken for fps_avg
  this.fps_avg = 0;                   //The current average fps displayed in the debug UI
  this.fps_avg_acc = 0;               //The accumulation of the last avgcount fps samples
  this.lit = 0;
  this.llt = new Date().getTime();
};

gameCore.prototype.clientOnDisconnect = function(data) {
  this.players.self.state = 'not-connected';
  this.players.self.online = false;

  //set color or other stateful info
};

// a function to reset the player and grid positions
gameCore.prototype.clientResetPosition = function() {

};

gameCore.prototype.clientOnReadyGame = function(data) {
  let server_time = parseFloat(data.replace('-', '.'));
  // would need to update for > 2 players
  let player_host = this.players.self.host ? this.players.self : this.players.other;
  let player_client = this.players.self.host ? this.players.other : this.players.self;

  this.local_time = server_time + this.net_latency;
  console.log('server time is ' + this.local_time);

  // could set colors here
  // player_host.info_color = '#2288cc';
  // player_client.info_color = '#cc8822';  

  this.players.self.state = 'YOU ' + this.players.self.state;
  // this.socket.send('c.' + this.players.self.color || 0xff0000);
}

gameCore.prototype.clientOnJoinGame = function(data) {
  this.players.self.host = false;
  this.players.self.state = 'connected.joined.waiting';
  //maybe set color 
  this.clientResetPositions();
}

gameCore.prototype.clientOnHostGame = function(data) {
  let server_time = parseFloat(data.replace('-', '.'));
  this.local_time = server_time + this.net_latency;
  this.players.self.host = true;
  this.players.self.state = 'hosting.waiting for player';
  // maybe set color
  //this.players.self.info_color = ...

  this.clientResetPositions();
};

gameCore.prototype.clientResetPositions = function() {
  console.log("TODO", "Client reset positions");
};

gameCore.prototype.clientOnPing = function(data) {
  this.net_ping = new Date().getTime() - parseFloat(data);
  this.net_latency = this.net_ping/2;
};

gameCore.prototype.clientOnConnected = function(data) {
  this.players.self.id = data.id;
  // this.players.self.info_color = 0xff0000;
  this.players.self.state = 'connected';
  this.players.self.online = true;
};

gameCore.prototype.clientOnNetMessage = function(data) {
  let commands = data.split('.');
  let command = commands[0];
  let subCommand = commands[1] || null;
  let commandData = commands[2] || null;

  switch(command) {
    case 's': //server message
      switch(subCommand) {
        case 'h':
          this.clientOnHostGame(commandData);
          break;
        case 'j':
          this.clientOnJoinGame(commandData);
          break;
        case 'r':
          this.clientOnReadyGame(commandData);
          break;
        case 'e':
          this.clientOnDisconnect(commandData);
          break;
        case 'p':
          this.clientOnPing(commandData);
          break;
        // case 'c':
        //   this.clientOnOtherClientColorChange(commandData);
        //   break;
      }
      break;
  }
};

gameCore.prototype.clientConnectToServer = function() {
  // initial definition
  this.socket = io.connect(SERVER_URL + ':' + SERVER_PORT);
  let { socket } = this;

  socket.on('connect', () => {
    this.players.self.state = 'connecting';
  });
  socket.on('disconnect', (d) => this.clientOnDisconnect(d));
  socket.on('onserverupdate', (d) => this.clientOnServerUpdateReceived());
  socket.on('onconnected', (d) => this.clientOnConnected(d));
  socket.on('error', (d) => this.clientOnDisconnect(d));
  socket.on('message', (d) => this.clientOnNetMessage(d));
};

gameCore.prototype.clientCreatePingTimer = function() {
  const { socket } = this;
  setInterval(() => {
    this.last_ping_time = new Date().getTime();// - this.fake_lag;
    socket.send('p.' + (this.last_ping_time));
  }, 1000);
};

gameCore.prototype.serverUpdatePhysics = function() {
  // player one
  this.players.self.old_state = this.players.self.curr_state;
  this.players.self.handleInputs(this.socket, this.local_time, this.input_seq);
  this.players.self.curr_state = this.players.self.player.position;

  // TODO player 2+

  this.players.self.inputs = [];
  //player 2 inputs
  // this.players.other.inputs = [];
};

gameCore.prototype.clientUpdate = function() {
  this.players.self.inputs.pop 
};

gameCore.prototype.clientUpdatePhysics = function() {
  this.players.self.state_time = this.local_time;
  this.players.self.old_state = this.players.self.curr_state;
  this.players.self.handleInputs(this.socket, this.local_time, this.input_seq);

  // this.players.self.processInputs();
  // this.players.self.handleKeyPress();
  this.players.self.curr_state = this.players.self.player.position;
  this.players.self.state_time = this.local_time;
};

gameCore.prototype.onStep = function() {
  let { scene, camera, updateControls, renderer } = this;
  this._pdt = (new Date().getTime() - this._pdte)/1000.0;
  this._pdte = new Date().getTime();
  //scene.step.call(scene, PHYSICS_FRAMERATE / 1000, undefined, this.onStep.bind(this) );
  if(global.isServer) {
    renderer.render(scene, camera);
    setTimeout(() => {
      scene.step.call(scene, PHYSICS_FRAMERATE / 1000, undefined, this.onStep.bind(this) )
    }, PHYSICS_FRAMERATE);
    this.serverUpdatePhysics();
  }
  else {
    stats.begin();
    updateControls();
    this.clientUpdatePhysics();
    renderer.render(scene, camera);
    setTimeout(() => {
      scene.step.call(scene, PHYSICS_FRAMERATE / 1000, undefined, this.onStep.bind(this) )
    }, PHYSICS_FRAMERATE);
    stats.end();
  }
};

gameCore.prototype.createTimer = function() {
  setInterval(function() {
    this._dt = new Date().getTime() - this._dte;
    this._dte = new Date().getTime();
    this.local_time += this._dt/1000.0;
  }.bind(this), 4); 
};

gameCore.prototype.createPhysicsSimulation = function() {
  this.onStep();
};

gameCore.prototype.update = function(time) {
  this.dt = this.lastFrameTime ? (time - this.lastFrameTime/1000) : 0.016;
  this.lastFrameTime = time;
  if(global.isServer) {
    this.serverUpdate();
  }
  else {
    this.clientUpdate();
  }

  this.updateId =  window.requestAnimationFrame( this.update.bind(this), this.viewport);
};

gameCore.prototype.serverUpdate = function() {
  this.server_time = this.local_time;

  this.lastState = {
  //  hp: this.players.self.pos
  };

  if(this.players.self.instance) {
    this.players.self.instance.emit('onserverupdate', this.lastState);
  }

  if(this.players.other.instance) {
    this.players.other.instance.emit('onserverupdate', this.lastState);
  }
};

//server side we set the 'game_core' class to a global type, so that it can use it anywhere.
if(global.isServer) {
    module.exports = global.gameCore = gameCore;
}

function createServerScene(opts, THREE) {
  const assign = require('object-assign');
  const dpr = window.devicePixelRatio;
  const renderer = new THREE.WebGLRenderer(assign({
    antialias: true // default enabled
  }, opts.renderer));
  const canvas = renderer.domElement;
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
  const target = new THREE.Vector3();
  // 3D scene
  const scene = new THREE.Scene();
  return {
    camera,
    scene,
    renderer,
    canvas
  };
}

function empty(elem) {
  while (elem.lastChild) elem.removeChild(elem.lastChild);
}


module.exports = gameCore;
