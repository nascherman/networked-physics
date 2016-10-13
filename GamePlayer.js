var Physijs = require('./libs/physi.js');
var THREE = global.THREE;
var createBox = require('./createObj').createBox;
const BOX_SIZE = 3;

function GamePlayer(opts, playerInstance) {
  if(!opts.scene || !opts.camera || !opts.renderer || (!opts.index && opts.index < 0)) {
    console.error('playable object must have a index, scene, camera, and renderer');
  }
  Object.assign(this, opts, {
    teamColor: 0xff0000
  });
  this.initialRotation = this.camera.rotation.z;
  this.player = createBox({
    x: opts.x || 0,
    y: opts.y || 10,
    z: opts.z || 0,
    width: BOX_SIZE,
    height: BOX_SIZE,
    depth: BOX_SIZE,
    player: true,
    visible: this.visible,
    teamColor: this.teamColor,
    index: this.index
  }, opts.scene);
}

const calcAngularMomentum = (initialRotation, cameraRotation, acceleration) => {
  // console.log(acceleration * cameangleAcceleration = angleAcceleration > 0 ? angleAcceleration + (acceleration/2 - angleAcceleration) : angleAcceleration - (acceleration/2 - angleAcceleration);raRotation/initialRotation);
  let offsetAngle = -(cameraRotation - initialRotation);
  let angleAcceleration, rotationAcceleration;
  if(offsetAngle < 90) {
    angleAcceleration = acceleration * ( 1 - offsetAngle/90);
    rotationAcceleration = angleAcceleration > 0 ? acceleration - angleAcceleration : acceleration + angleAcceleration;
  }
  else if(offsetAngle > 90 && offsetAngle < 180) {
    angleAcceleration = -(acceleration * ((offsetAngle - 90)/90));
    rotationAcceleration = angleAcceleration > 0 ? acceleration - angleAcceleration : acceleration + angleAcceleration;
  }
  else if(offsetAngle > 180 && offsetAngle < 270) {
    angleAcceleration = -(acceleration * ( 1 - (offsetAngle - 180)/90));
    rotationAcceleration = angleAcceleration > 0 ? acceleration - angleAcceleration : acceleration + angleAcceleration;
    rotationAcceleration = -rotationAcceleration;
  }
  else {
    angleAcceleration = acceleration * ((offsetAngle - 270)/90);
    rotationAcceleration = angleAcceleration > 0 ? acceleration - angleAcceleration : acceleration + angleAcceleration;
    rotationAcceleration= - rotationAcceleration;
  }
  
  console.log(angleAcceleration, rotationAcceleration);
  return {
    angleAcceleration: angleAcceleration,
    rotationAcceleration: rotationAcceleration
  }
};

GamePlayer.prototype.handleKeyPress = function() {
  // w 87, a 65, s 83, d 68
  let vec; 
  let box = this.player;
  let zRotation = this.camera.rotation.z;

  const { angleAcceleration, rotationAcceleration }  = calcAngularMomentum(this.initialRotation * (180/Math.PI), zRotation * (180/Math.PI), this.player.acceleration)
  if (keys[87]) {
    vec = new THREE.Vector3(angleAcceleration, 0, rotationAcceleration);
    box.physics.angular_velocity = vec;
  }
  else if (keys[83]) {
    vec = new THREE.Vector3(-angleAcceleration, 0, -rotationAcceleration);
    box.physics.angular_velocity = vec;
  }
  else if (keys[65]) {
    vec = new THREE.Vector3(-rotationAcceleration, 0, -angleAcceleration);
    box.physics.angular_velocity = vec;
  }
  else if (keys[68]) {
    vec = new THREE.Vector3(rotationAcceleration, 0 , angleAcceleration);
    box.physics.angular_velocity = vec;
  }
  else {
 //   box.physics.angular_velocity = new THREE.Vector3(0, 0, 0);
  }
};

module.exports = GamePlayer;
