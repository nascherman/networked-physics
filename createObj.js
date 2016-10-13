var THREE = global.THREE;
var Physijs = require('./libs/physi.js');

const ACCELERATION = 3;
const DEFAULT_COLOR = 0xaaaaaa;
const PLAYER_GROUP = 2;

const createBox = function(opts, scene) {
  let _this = this;
  const { x, y, z,  width, height, depth, acceleration, player, mass } = opts;
  let boxMaterial = new THREE.MeshLambertMaterial({ color: opts.teamColor || DEFAULT_COLOR });
  var box = new Physijs.Box(
   new THREE.BoxGeometry( width, height, depth ),
   boxMaterial,
   {
    mass: mass ? mass : 1
   }
  );
  box.type = 'box';
  box.teamColor = opts.teamColor || DEFAULT_COLOR;
  box.position.set(x, y, z);
  box.acceleration = acceleration ? acceleration : ACCELERATION;
  box.player = player ? player : false;
  if(!box.player) {
   box.addEventListener('physics.contactStart', (report) => {
     if(report.other_body.player === true) {
      // let weldedMesh = _this.createCompositeObject(scene, box, report.other_body);
      // scene.remove(report.other_body);
      // scene.remove(box);
      // weldedMesh.player = true;
      // playerBox = weldedMesh;
      // scene.add(weldedMesh);
      box.material.color.setHex(report.other_body.teamColor);
     }
   });
  }
  else {
    box.physics.collision_mask = PLAYER_GROUP;
    box.physics.collision_groups = PLAYER_GROUP;
  }
  box.visible = opts.visible === false ? opts.visible : true;
  scene.add(box);
  return box;
};

const createSphere = function(opts, scene) {
  const { x, y, z,  radius, width, height, acceleration, player, mass } = opts;
  let sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
  
  var sphere = new Physijs.Sphere(
   new THREE.SphereGeometry( radius, widthSegments, heightSegments ),
   sphereMaterial,
   {
    mass: mass ? mass : 1
   }
  );
  sphere.type = 'sphere';
  sphere.position.set(x, y, z);
  sphere.acceleration = acceleration ? acceleration : ACCELERATION;
  sphere.player = player ? player : false;
  if(!sphere.player) {
    sphere.addEventListener('physics.contactStart', (report) => {
     if(report.other_body.player === true) {
       sphere.material.color.setHex(0xff0000);
       // let constraint
     }
   });
  }
  scene.add(sphere);
  return sphere;
};

module.exports = {
  createBox: createBox,
  createSphere: createSphere
}
