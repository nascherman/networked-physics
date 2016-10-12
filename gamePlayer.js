var Physijs = require('./libs/physi.js');
var THREE = global.THREE;
var createBox = require('./createObj').createBox;
const BOX_SIZE = 3;

function gamePlayer(opts) {
  if(!opts.scene || !opts.camera || !opts.renderer || (!opts.index && opts.index < 0)) {
    console.error('playable object must have a index, scene, camera, and renderer');
  }
  Object.assign(this, opts, {
    teamColor: 0xff0000
  });
  this.player = createBox({
    x: opts.x || 0,
    y: opts.y || 10,
    z: opts.z || 0,
    width: BOX_SIZE,
    height: BOX_SIZE,
    depth: BOX_SIZE,
    player: true,
    teamColor: this.teamColor,
    index: opts.index
  }, opts.scene);
}

const calcAngularMomentum = (cameraRotation, acceleration) => {
  console.log('TODO');
};

gamePlayer.prototype.handleKeyPress = function() {
  // w 87, a 65, s 83, d 68
  let vec; 
  let box = this.player;
  if (keys[87]) {
    vec = new THREE.Vector3(box.acceleration, 0, 0);
    box.physics.angular_velocity = vec;
  }
  else if (keys[83]) {
    vec = new THREE.Vector3(-box.acceleration, 0, 0);
    box.physics.angular_velocity = vec;
  }
  else if (keys[65]) {
    vec = new THREE.Vector3(0, 0, -box.acceleration);
    box.physics.angular_velocity = vec;
  }
  else if (keys[68]) {
    vec = new THREE.Vector3(0, 0 , box.acceleration);
    box.physics.angular_velocity = vec;
  }
  else {
 //   box.physics.angular_velocity = new THREE.Vector3(0, 0, 0);
  }
};

module.exports = gamePlayer;
