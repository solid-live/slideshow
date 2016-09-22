#!/usr/bin/env node

// Output random images
var commander = require('commander')
var debug     = require('debug')('sl_slideshow:imgur')
var slideshow = require('../')

/**
 * run as a command
 * @param  {Array} argv Args, argv[2] is the uri
 */
function bin(argv) {
  commander
  .option('-t, --time <time>', 'the start time')
    .parse(process.argv)

  var playlist = commander.args[0]
  var uri      = commander.args[1]
  var time = commander.time

  slideshow.addToPlaylist(playlist, uri, null, time)
}

// If one import this file, this is a module, otherwise a library
if (require.main === module) {
  bin(process.argv)
}

module.exports = bin
