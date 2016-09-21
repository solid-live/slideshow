module.exports = {
  'anyObj': anyObj,
  'addToPlaylist': addToPlaylist,
  'createDeletePatch': createDeletePatch,
  'createInsertPatch': createInsertPatch,
  'deleteFromPlaylist': deleteFromPlaylist,
  'replaceFromPlaylist': replaceFromPlaylist
}

// requires
var debug = require('debug')('sl_slideshow:slideshow')
var shell = require('rdf-shell')
var timestamp = require('unix-timestamp')
var $rdf = require('rdflib')

/**
 * Get the value or uri from an object
 * @param  {object} g And rdflib graph object
 * @param  {string} s And rdflib subject
 * @param  {string} p Predicate as a string
 * @return {string}   The value of the object or null
 */
function anyObj (g, s, p) {
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
 * adds an item to a playlist
 * @param  {string} playlistURI The playlist URI
 * @param  {string} mediaURI    The mediaURI to add
 */
function addToPlaylist (playlistURI, mediaURI) {
  var params = []
  var mtime = Math.floor(timestamp.now())
  params.push({ 'uri': mediaURI, 'mtime': mtime, 'base': playlistURI })

  var patch = ''
  debug('params', params)
  patch += createInsertPatch(params)

  console.log('patch', patch)
  shell.patch(playlistURI, patch, function (err, ret) {
    if (err) {
      console.error(err)
    } else {
      console.log(ret)
    }
  })
}

/**
 * Create an insert patch
 * @param  {array}  params parameters for the patch
 * @param  {string} params.uri        The uri to delete
 * @param  {number} params.mtime      The mod time
 * @param  {string} params.base       The uri base
 * @return {string}                   The patch
 */
function createInsertPatch (params) {
  if (!params) {
    return
  }
  var sparql = 'INSERT DATA { \n'
  for (var i = 0; i < params.length; i++) {
    var param = params[i]
    sparql += $rdf.sym(param.base) + ' '
    sparql += $rdf.sym('http://www.w3.org/ns/ldp#contains') + ' '
    sparql += $rdf.sym(param.uri) + ' .\n'

    sparql += $rdf.sym(param.uri) + ' '
    sparql += $rdf.sym('http://www.w3.org/ns/posix/stat#mtime') + ' '
    sparql += param.mtime
    sparql += ' .\n'
  }

  sparql += ' }\n'

  return sparql
}

/**
 * deletes the last item from a playlist
 * @param  {string} playlistURI  The playlist URI
 * @param  {number} num          The number to delete
 * @param  {number} keep         The number to keep
 */
function deleteFromPlaylist (playlistURI, num, keep) {
  // main
  shell.cat(playlistURI, function (err, content, playlistURI) {
    if (err) {
      console.error(err)
    } else {
      var files = []
      var sort = 'asc'
      var g = $rdf.graph()
      $rdf.parse(content, g, playlistURI, 'text/turtle')

      var arr = g.statementsMatching(null, $rdf.sym('http://www.w3.org/ns/ldp#contains'), null, $rdf.sym(playlistURI))
      console.log(arr)
      for (var i = 0; i < arr.length; i++) {
        var file = arr[i]
        if (file.object && file.object.uri && /.ttl$/.test(file.object.uri)) {
          continue
        }
        var mtime = anyObj(g, file.object, 'http://www.w3.org/ns/posix/stat#mtime')
        var title = anyObj(g, file.object, 'http://purl.org/dc/terms/title')

        files.push({ 'uri': file.object.uri, 'mtime': mtime, 'title': title })
      }
      files = files.sort(function (a, b) {
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
      for (i = 0; i < num; i++) {
        file = files[i]
        params.push({ 'uri': file.uri, 'mtime': file.mtime, 'base': playlistURI })
      }
      debug('params', params)

      if (files && files.length) {
        patch += createDeletePatch(params)
        console.log('patch', patch)
        shell.patch(playlistURI, patch, function (err, ret) {
          if (err) {
            console.error(err)
          } else {
            console.log(ret)
          }
        })
      }
    }
  })
}

/**
 * deletes the last item from a playlist
 * @param  {string} playlistURI The playlist URI
 * @param  {number} mediaURI    The media URI to add
 * @param  {number} keep        The number to keep
 */
function replaceFromPlaylist (playlistURI, mediaURI, keep) {
  // main
  shell.cat(playlistURI, function (err, content, uri) {
    if (err) {
      console.error(err)
    } else {
      var files = []
      var sort = 'asc'
      var g = $rdf.graph()
      $rdf.parse(content, g, uri, 'text/turtle')

      var arr = g.statementsMatching(null, $rdf.sym('http://www.w3.org/ns/ldp#contains'), null, $rdf.sym(uri))
      console.log(arr)
      for (var i = 0; i < arr.length; i++) {
        var file = arr[i]
        if (file.object && file.object.uri && /.ttl$/.test(file.object.uri)) {
          continue
        }
        var mtime = anyObj(g, file.object, 'http://www.w3.org/ns/posix/stat#mtime')
        var title = anyObj(g, file.object, 'http://purl.org/dc/terms/title')

        files.push({ 'uri': file.object.uri, 'mtime': mtime, 'title': title })
      }
      files = files.sort(function (a, b) {
        if (sort === 'desc') {
          return parseFloat(b.mtime) - parseFloat(a.mtime)
        } else {
          return parseFloat(a.mtime) - parseFloat(b.mtime)
        }
      })

      var patch = ''
      var params = []
      mtime = Math.floor(timestamp.now())
      params.push({ 'uri': mediaURI, 'mtime': mtime, 'base': playlistURI })
      debug('params', params)
      patch += createInsertPatch(params)

      var num
      if (files.length) {
        if (keep) {
          if ((files.length + 1 - keep) >= 0) {
            num = files.length + 1 - keep
          } else {
            num = 0
          }
        } else {
          num = 1
        }
        params = []
        for (i = 0; i < num; i++) {
          file = files[i]
          params.push({ 'uri': file.uri, 'mtime': file.mtime, 'base': playlistURI })
        }
        debug('params', params)
        var deletePatch = createDeletePatch(params)
        if (deletePatch) {
          patch += deletePatch
        }
      }

      console.log('patch', patch)
      shell.patch(uri, patch, function (err, ret) {
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
 * @return {string}                   The patch
 */
function createDeletePatch (params) {
  if (!params || !params.length) {
    return
  }
  var sparql = 'DELETE DATA { \n'
  for (var i = 0; i < params.length; i++) {
    var param = params[i]
    sparql += $rdf.sym(param.base) + ' '
    sparql += $rdf.sym('http://www.w3.org/ns/ldp#contains') + ' '
    sparql += $rdf.sym(param.uri) + ' .\n'

    sparql += $rdf.sym(param.uri) + ' '
    sparql += $rdf.sym('http://www.w3.org/ns/posix/stat#mtime') + ' '
    sparql += param.mtime
    sparql += ' .\n'
  }

  sparql += ' }\n'

  return sparql
}
