"use strict";

const { router } = require("./router");
const push = require("./push");

function setup(){
  push.configure();
}

module.exports = {
  router,
  setup
};