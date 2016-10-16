'use strict';
let gameCore = require('./game-core.js');

require('domready')(() => {
  gameCore = new gameCore();
  gameCore.viewport = document.getElementById('viewport');
  gameCore.start();
});