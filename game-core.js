'use strict';
global.THREE = require('three');
var THREE = global.THREE;
var Physijs = require('./libs/physi.js');
var loader = new THREE.TextureLoader();
var Stats = require('stats-js');
var stats = new Stats();

stats.setMode(2);

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
      antialias: true
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
  // Create our basic ThreeJS application
  var {
    renderer,
    camera,
    updateControls
  } = createScene(opts, THREE);
  this.renderer = renderer;
  this.camera = camera;
  this.scene = scene;
  this.updateControls = updateControls;

  renderer.shadowMap.enabled = true;
  renderer.shadowMapSoft = true;
  window.scene = scene;
  // camera.add(light);
  renderer.setClearColor(0xffffff);
 
  var floorMaterial = new THREE.MeshLambertMaterial({ map: loader.load('/assets/lush-grass.jpg') });
    // 0.4, //high friction
    // 0.1 //low restitution
  
  floorMaterial.map.wrapS = floorMaterial.map.wrapT = THREE.RepeatWrapping;
  floorMaterial.map.repeat.set(2.5,2.5);

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
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px'; 
  document.body.appendChild( stats.domElement );
  
  window.addEventListener('keydown', (e) => {
    keys[e.keyCode] = true;
  });

  window.addEventListener('keyup', (e) => {
    keys[e.keyCode] = false;
  });

  this.initScene();
  let { scene ,renderer, camera, updateControls } = this;
  // two players for now
  let index = 0;
  if(!this.server) {
    this.players = {
      self: new GamePlayer(Object.assign(this, {
        scene, 
        renderer, 
        camera, 
        index
      }), undefined)
      // other: new gampePlayer({
      //   scene, render, camera, ++index
      // })
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
    self: new GamePlayer(this, this.instance.player_host, {
        scene, 
        renderer, 
        camera, 
        index
      })
      // other: new gampePlayer(this, this.instance.player_client{
      //   scene, render, camera, ++index
      // })
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

  if(!this.server) {
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

gameCore.prototype.clientCreateConfiguration = function() {

}

gameCore.prototype.clientConnectToServer = function() {

}

gameCore.prototype.clientCreatePingTimer = function() {

}

gameCore.prototype.serverUpdatePhysics = function() {
  // this.players.self.
}

gameCore.prototype.clientUpdatePhysics = function() {
  this.players.self.state_time = this.local_time;
  this.players.self.old_state = this.players.self.curr_state;
  this.players.self.curr_state = this.players.self.player.position;
}

gameCore.prototype.onStep = function() {
    let { scene, camera, updateControls, renderer } = this;
    this._pdt = (new Date().getTime() - this._pdte)/1000.0;
    this._pdte = new Date().getTime();
    stats.begin();
    updateControls();
    this.players.self.handleKeyPress();
    renderer.render(scene, camera);
    setTimeout( scene.step.call(scene, PHYSICS_FRAMERATE / 1000, undefined, this.onStep.bind(this) ), PHYSICS_FRAMERATE);

    if(this.server) {
      this.serverUpdatePhysics();
    }
    else {
      this.clientUpdatePhysics();
    }

    stats.end();
  };

gameCore.prototype.createTimer = function() {
  setInterval(function() {
    this._dt = new Date().getTime() - this._dte;
    this._dte = new Date().getTime();
    this.local_time += this._dt/1000.0;
  }.bind(this), 4); 
}

gameCore.prototype.createPhysicsSimulation = function() {
  this.onStep();
}

module.exports = gameCore;
