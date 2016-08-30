#!/usr/bin/env node

// Output random images
var commander = require('commander')
var debug     = require('debug')('sl_slideshow:imgur')
var shell     = require('rdf-shell')
var $rdf      = require('rdflib')

/**
 * Get the value or uri from an object
 * @param  {object} g And rdflib graph object
 * @param  {string} s And rdflib subject
 * @param  {string} p Predicate as a string
 * @return {string}   The value of the object or null
 */
function anyObj(g, s, p) {
  var obj
  obj = g.any(s, $rdf.sym(p))
  if (obj && obj.value) {
    return obj.value
  }
  if (obj && obj.uri) {
    return obj.uri
  }
}

/**
 * deletes the last item from a playlist
 * @param  {string} uri  The playlist URI
 * @param  {number} num  The number to delete
 * @param  {number} keep The number to keep
 */
function deleteFromPlaylist(uri, num, keep) {
  // main
  shell.cat(uri, function(err, content, uri) {
    if (err) {
      console.error(err)
    } else {
      var files = []
      var sort = 'asc'
      var g = $rdf.graph()
      var f = $rdf.fetcher(g, 5000)
      $rdf.parse(content, g, uri, 'text/turtle')

      var arr = g.statementsMatching(null, $rdf.sym('http://www.w3.org/ns/ldp#contains'), null, $rdf.sym(uri))
      console.log(arr)
      for (var i = 0; i < arr.length; i++) {
        var file = arr[i]
        var subject = file.subject
        if (file.object && file.object.uri && /.ttl$/.test(file.object.uri) ) {
          continue
        }
        var mtime = anyObj(g, file.object, 'http://www.w3.org/ns/posix/stat#mtime')
        var title = anyObj(g, file.object, 'http://purl.org/dc/terms/title')

        files.push({ "uri" : file.object.uri, "mtime" : mtime, "title" : title })
      }
      files = files.sort(function(a,b) {
        if (sort === 'desc') {
          return parseFloat(b.mtime) - parseFloat(a.mtime)
        } else {
          return parseFloat(a.mtime) - parseFloat(b.mtime)
        }
      })

      var patch = ''
      num = num || 1
      if (keep && (files.length - keep) >= 0) {
        num = files.length - keep
      }
      var params = []
      for (var i = 0; i < num; i++) {
        var file = files[i]
        params.push({ "uri" : file.uri, "mtime" : file.mtime, "base" : uri })
      }
      debug('params', params)
      patch += createDeletePatch(params)

      console.log('patch', patch)
      shell.patch([null, null, uri, patch], function(err, ret) {
        if (err) {
          console.error(err)
        } else {
          console.log(ret)
        }
      })
    }
  })
}

/**
 * Create a delete patch
 * @param  {array}  params parameters for the patch
 * @param  {string} params.uri        The uri to delete
 * @param  {number} params.mtime      The mod time
 * @param  {string} params.base       The uri base
 * @return {string}                  The patch
 */
function createDeletePatch(params) {
  if (!params) {
    return
  }
  var sparql = 'DELETE DATA { \n'
  for (var i = 0; i < params.length; i++) {
    var param = params[i]
    sparql   +=  $rdf.sym(param.base) + ' '
    sparql   +=  $rdf.sym('http://www.w3.org/ns/ldp#contains') + ' '
    sparql   +=  $rdf.sym(param.uri) + ' .\n'

    sparql   +=  $rdf.sym(param.uri) + ' '
    sparql   +=  $rdf.sym('http://www.w3.org/ns/posix/stat#mtime') + ' '
    sparql   +=  param.mtime
    sparql   +=  ' .\n'
  }

  sparql     +=  ' }\n'

  return sparql

}



/**
 * run as a command
 * @param  {Array} argv Args, argv[2] is the uri
 */
function bin(argv) {
  commander
    .option('-k, --keep <n>', 'how many items to keep', parseInt)
    .option('-n, --num <n>', 'how many items to delete', parseInt)
    .parse(process.argv)

  var uri  = commander.args[0]
  var num  = commander.num
  var keep = commander.keep

  deleteFromPlaylist(uri, num, keep)
}

// If one import this file, this is a module, otherwise a library
if (require.main === module) {
  bin(process.argv)
}

module.exports = bin
