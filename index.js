'use strict';
global.THREE = require('three');
var THREE = global.THREE;
var Physijs = require('physijs-browserify')(global.THREE);
var loader = new global.THREE.TextureLoader();
var Stats = require('stats-js');
var stats = new Stats();

stats.setMode(1);

Physijs.scripts.worker = '/libs/physi-worker.js';
Physijs.scripts.ammo = '/libs/ammo.js';

var createScene = require('scene-template');
var createLoop = require('raf-loop');

const PLANE_DEPTH = 50;
const PLANE_WIDTH = 50;
const SPACING = 5;
const MARGIN = 5;
const ACCELERATION = 3;
const GRID_SIZE = 2;

let keys = [];

var initScene = function() {
  var scene = new Physijs.Scene();
  var ambient = new THREE.AmbientLight(0xffffff, 1.5);

  var opts = {
    renderer: {
      antialias: true
    },
    scene: scene,
    controls: {
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
  
  renderer.shadowMap.enabled = true;
  renderer.shadowMapSoft = true;
  window.scene = scene;
  // camera.add(light);
  renderer.setClearColor(0xffffff);
 

  var plane = new Physijs.createMaterial(
    new THREE.MeshLambertMaterial({ map: loader.load('/assets/lush-grass.jpg') }),
    0.8, //high friction
    0.4 //low restitution
  );
  plane.map.wrapS = plane.map.wrapT = THREE.RepeatWrapping;
  plane.map.repeat.set(2.5,2.5);

  var ground = new Physijs.BoxMesh(
    new THREE.BoxGeometry(PLANE_WIDTH, 1, PLANE_DEPTH),
    plane,
    0 // mass
  );

  var light = new THREE.SpotLight( 0xFFFFFF );
  light.intensity = 1.5;
  light.position.set( 20, 40, -15 );
  light.target.position.copy( scene.position );

  initGrid(scene);

  let playerBox = createObj({
    x: 0,
    y: 10,
    z: 0,
    width: 5,
    height: 5,
    depth: 5,
    acceleration: ACCELERATION,
    player: true
  }, scene);

  scene.add(ground);
  scene.add(light);

  createLoop((dt) => {
    stats.begin();
    updateControls();
    scene.simulate();
    handleKeyPress(playerBox);
    renderer.render(scene, camera);
    stats.end();
  }).start();
};

var handleKeyPress = function(box) {
  // w 87, a 65, s 83, d 68
  let vec; 
  if (keys[87]) {
    vec = new THREE.Vector3(box.acceleration, 0, 0)
    box.setAngularVelocity(vec);
  }
  if (keys[83]) {
    vec = new THREE.Vector3(-box.acceleration, 0, 0);
   box.setAngularVelocity(vec);
  }
  if (keys[65]) {
    vec = new THREE.Vector3(0, 0, -box.acceleration);
    box.setAngularVelocity(vec);
  }
  if (keys[68]) {
    let vec = new THREE.Vector3(0, 0 , box.acceleration)
    box.setAngularVelocity(vec);
  }
};

var demo = function() {
  var viewPort = document.createElement('div');
  viewPort.setAttribute('id', 'viewport');
  document.body.appendChild(viewPort);
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

  initScene();
};

var initGrid = function(scene) {
  for(var i = -PLANE_WIDTH/2 + MARGIN; i < PLANE_WIDTH/2; i += SPACING) {
    for(var j = -PLANE_DEPTH/2 + MARGIN; j < PLANE_DEPTH/2; j += SPACING) {
      createObj({
        x: i,
        y: 1,
        z: j,
        width: GRID_SIZE,
        height: GRID_SIZE,
        depth: GRID_SIZE
      }, scene);
    }
  }
}

var createObj = function(opts, scene) {
   const { x, y, z,  width, height, depth, acceleration, player } = opts;
   console.log(opts);
   var box = new Physijs.BoxMesh(
    new THREE.BoxGeometry( width, height, depth ),
    new THREE.MeshLambertMaterial({ color: 0x888888 })
  );
   box.position.set(x, y, z);
   box.acceleration = acceleration ? acceleration : ACCELERATION;
   box.player = player ? player : false;
   if(!box.player) {
    box.addEventListener('collision', (collided_with, linearVelocity, angularVelocty) => {
      if(collided_with.player === true) {
        box.material.color.setHex(0xff0000);
      }
    });
   }
   scene.add(box);
   return box;
}

window.onload = demo();