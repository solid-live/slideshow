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
    .parse(process.argv)

  var playlist = commander.args[0]
  var uri      = commander.args[1]

  slideshow.addToPlaylist(playlist, uri)
}

// If one import this file, this is a module, otherwise a library
if (require.main === module) {
  bin(process.argv)
}

module.exports = bin
