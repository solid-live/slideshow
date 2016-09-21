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
    .option('-k, --keep <n>', 'how many items to keep', parseInt)
    .option('-n, --num <n>', 'how many items to delete', parseInt)
    .option('-s, --sort <order>', 'how many items to delete')
    .parse(process.argv)

  var uri  = commander.args[0]
  var num  = commander.num
  var keep = commander.keep
  var sortOrder = commander.sort

  slideshow.deleteFromPlaylist(uri, num, keep, sortOrder)
}

// If one import this file, this is a module, otherwise a library
if (require.main === module) {
  bin(process.argv)
}

module.exports = bin
