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
  this.old_state = {
    x: opts.x,
    y: opts.y,
    z: opts.z
  };
  this.curr_state = this.old_state;
  this.state_time = new Date().getTime();
  this.inputs = [];
  this.input_seq = 0;

  //could also set up initial position at this point; 
}

// change angular velocity based on camera rotation from original position.
const calcAngularMomentum = (initialRotation, cameraRotation, acceleration) => {
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
  return {
    angleAcceleration: angleAcceleration,
    rotationAcceleration: rotationAcceleration
  }
};

// client pushes inputs to self
GamePlayer.prototype.handleInputs = function(socket, local_time) {
  let input = [];
  this.client_has_input = false;

  if(keys[87]) {
    input.push('w');
  }
  else if(keys[65]) {
    input.push('a');
  }
  else if (keys[83]) {
    input.push('s')
  }
  else if(keys[68]) {
    input.push('d');
  }
  if(input.length) {
    this.input_seq++;
    this.inputs.push({
      inputs: input,
      time: local_time.toFixed(3),
      seq: this.input_seq
    })
    var server_packet = 'i.';
    server_packet += input.join('-') + '.';
    server_packet += local_time.toFixed(3).replace('.','-') + '.';
    server_packet += this.input_seq;
    //Go
    socket.send(  server_packet  );
  }
}

//server/client pops inputs returns positions to client on broadcast
GamePlayer.prototype.processInputs = function() {
  // w 87, a 65, s 83, d 68
  let vec; 
  let box = this.player;
  let zRotation = this.camera.rotation.z;

  if(this.inputs.length) {
    for(var i = 0; i < this.inputs.length; i++) {
      if(this.inputs[i].seq > this.last_input_seq) {
        let inputs = this.inputs[i].inputs;
        for(let i in inputs) {
          let input = inputs[i];
          const { angleAcceleration, rotationAcceleration }  = calcAngularMomentum(this.initialRotation * (180/Math.PI), zRotation * (180/Math.PI), this.player.acceleration)
          if (input === 'w') {    
            box.physics.angular_velocity.set(angleAcceleration, 0, rotationAcceleration)
          }
          else if (input === 's') {            
            box.physics.angular_velocity.set(-angleAcceleration, 0, -rotationAcceleration);
          }
          else if (input === 'a') {
            box.physics.angular_velocity.set(rotationAcceleration, 0, -angleAcceleration);
          }
          else if (input === 'd') {
            box.physics.angular_velocity.set(-rotationAcceleration, 0 , angleAcceleration);
          }  
        }
      }
    }
    this.last_input_time = this.inputs[this.inputs.length - 1].time;
    this.last_input_seq = this.inputs[this.inputs.length -1].seq;
    
  }
};

// naive change direct input
GamePlayer.prototype.clientInput = function(input) {
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
    vec = new THREE.Vector3(rotationAcceleration, 0, -angleAcceleration);
    box.physics.angular_velocity = vec;
  }
  else if (keys[68]) {
    vec = new THREE.Vector3(-rotationAcceleration, 0 , angleAcceleration);
    box.physics.angular_velocity = vec;
  }  
}


module.exports = GamePlayer;
