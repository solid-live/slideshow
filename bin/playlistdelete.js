#!/usr/bin/env node

// Output random images
var debug  = require('debug')('sl_slideshow:imgur')
var shell  = require('rdf-shell')
var $rdf   = require('rdflib')

var uri    = process.argv[2]

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

    var del   = files[0]
    var patch = createDeletePatch(del.uri, del.mtime, uri)

    console.log(patch)
    shell.patch([null, null, uri, patch], function(err, ret) {
      if (err) {
        console.error(err)
      } else {
        console.log(ret)
      }
    })
  }
})

/**
 * Create a delete patch
 * @param  {string} uri   The uri to delete
 * @param  {number} mtime The mod time
 * @param  {string} base  The uri base
 * @return {string}       the patch
 */
function createDeletePatch(uri, mtime, base) {
  if (!uri || !mtime) {
    return
  }
  var sparql = 'DELETE DATA { ' + $rdf.sym(base) + ' '
  sparql   +=  $rdf.sym('http://www.w3.org/ns/ldp#contains') + ' '
  sparql   +=  $rdf.sym(uri) + ' .\n'

  sparql   +=  $rdf.sym(uri) + ' '
  sparql   +=  $rdf.sym('http://www.w3.org/ns/posix/stat#mtime') + ' '
  sparql   +=  mtime + ' .\n }'

  return sparql

}
