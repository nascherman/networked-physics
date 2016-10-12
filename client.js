'use strict';
let gameCore = require('./game-core.js');

require('domready')(() => {
  gameCore = new gameCore();
  gameCore.start();
});