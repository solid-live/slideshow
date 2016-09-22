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
var sort = 'desc'

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
 * @param  {string}  playlistURI The playlist URI
 * @param  {string}  mediaURI    The mediaURI to add
 * @param  {boolean} container   Is playlist a container
 * @param  {number}  time        The start time
 */
function addToPlaylist (playlistURI, mediaURI, container, time) {
  var params = []
  var mtime
  if (container) {
    mtime = Math.floor(timestamp.now())
  }
  params.push({ 'uri': mediaURI, 'mtime': mtime, 'base': playlistURI, 'startTime' : time })

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

    if (!param.mtime) {
      var index = param.index || Math.floor(Math.random() * 1000000)
      sparql += $rdf.sym(param.base + '#this') + ' '
      sparql += $rdf.sym('http://purl.org/ontology/pbo/core#playlist_slot') + ' '
      sparql += $rdf.sym('#' + index) + ' .\n'

      sparql += $rdf.sym('#' + index) + ' '
      sparql += $rdf.sym('http://purl.org/ontology/olo/core#index') + ' '
      sparql += index
      sparql += ' .\n'

      sparql += $rdf.sym('#' + index) + ' '
      sparql += $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') + ' '
      sparql += $rdf.sym('http://purl.org/ontology/pbo/core#PlaylistSlot')
      sparql += ' .\n'

      sparql += $rdf.sym('#' + index) + ' '
      sparql += $rdf.sym('http://purl.org/ontology/pbo/core#playlist_item') + ' '
      sparql += $rdf.sym(param.uri) + ' .\n'

      if (param.startTime) {
        sparql += $rdf.sym('#' + index) + ' '
        sparql += $rdf.sym('https://schema.org/startTime') + ' '
        sparql += '"' + param.startTime + '" .\n'
      }

    } else {
      sparql += $rdf.sym(param.base) + ' '
      sparql += $rdf.sym('http://www.w3.org/ns/ldp#contains') + ' '
      sparql += $rdf.sym(param.uri) + ' .\n'

      sparql += $rdf.sym(param.uri) + ' '
      sparql += $rdf.sym('http://www.w3.org/ns/posix/stat#mtime') + ' '
      sparql += param.mtime
      sparql += ' .\n'
    }
  }

  sparql += ' }\n'

  return sparql
}

/**
 * sort files
 * @param  {object} a first element
 * @param  {object} b second element
 */
function sortFiles(a, b) {
  sort = sort || 'desc'
  if (a.type === b.type) {
    if (a.file === b.file) {
      var ai = a.start || a.mtime || a.index
      var bi = b.start || b.mtime || b.index
      if (sort === 'desc') {
        return parseFloat(bi) - parseFloat(ai)
      } else {
        return parseFloat(ai) - parseFloat(bi)
      }
    } else {
      var ai = a.mtime || a.index
      var bi = b.mtime || b.index
      if (sort === 'desc') {
        return parseFloat(bi) - parseFloat(ai)
      } else {
        return parseFloat(ai) - parseFloat(bi)
      }
    }
  } else {
    var order = [1,2,0]
    return order[b.type] - order[a.type]
  }
}

/**
 * deletes the last item from a playlist
 * @param  {string} playlistURI  The playlist URI
 * @param  {number} num          The number to delete
 * @param  {number} keep         The number to keep
 * @param  {number} offset       The offset to start from
 * @param  {string} sortOrder    The sort order
 */
function deleteFromPlaylist (playlistURI, num, keep, offset, sortOrder) {
  // main
  debug('arguments', arguments)
  sort = sortOrder || sort
  shell.cat(playlistURI, function (err, content, playlistURI) {
    if (err) {
      console.error(err)
    } else {
      var slots = false
      var files = []
      var sort = 'asc'
      var g = $rdf.graph()
      $rdf.parse(content, g, playlistURI, 'text/turtle')

      var arr = g.statementsMatching(null, $rdf.sym('http://www.w3.org/ns/ldp#contains'), null, $rdf.sym(playlistURI))
      if (!arr || !arr.length) {
        arr = g.statementsMatching(null, $rdf.sym('http://purl.org/ontology/pbo/core#playlist_slot'), null, $rdf.sym(playlistURI))
        slots = true
      }
      console.log(arr)

      for (var i = 0; i < arr.length; i++) {
        var file = arr[i]
        var obj = file.object
        if (file.object && file.object.uri && /.ttl$/.test(file.object.uri)) {
          continue
        }

        var mtime = anyObj(g, obj, 'http://www.w3.org/ns/posix/stat#mtime')
        var index = anyObj(g, obj, 'http://purl.org/ontology/olo/core#index')
        var title = anyObj(g, obj, 'http://purl.org/dc/terms/title')
        var startTime = anyObj(g, obj, 'https://schema.org/startTime')
        var subtitle = anyObj(g, obj, 'http://purl.org/ontology/po/Subtitle')

        if (slots) {
          var mediaURI = anyObj(g, obj, 'http://purl.org/ontology/pbo/core#playlist_item')
        } else {
          var mediaURI = obj.uri
        }

        files.push({ "uri" : mediaURI, "mtime" : mtime, "title" : title, "index" : index, "file" : file, 'startTime' : startTime, 'subject'  : obj.uri , 'subtitle' : subtitle, "obj" : obj.uri })
      }
      files = files.sort(sortFiles)

      var patch = ''

      num = num || 1
      if (keep && (files.length - keep) >= 0) {
        num = files.length - keep
      }

      var params = []
      var first = 0
      if (offset) {
        first = offset
      }
      var last = num
      if (offset) {
        last = num + offset
      }
      if (last > files.length) {
        last = files.length
      }
      debug('first', first, 'last', last, 'num', num, 'keep', keep, 'offset', offset)
      for (i = first; i < last; i++) {
        file = files[i]
        params.push({ 'uri': file.uri, 'mtime': file.mtime, 'base': playlistURI, 'index': file.index, 'obj' : file.obj })
      }
      debug('params', params)

      if (files && files.length) {
        patch += createDeletePatch(params, g)
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
        var deletePatch = createDeletePatch(params, g)
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
 * @param  {object} params.g          The graph
 * @return {string}                   The patch
 */
function createDeletePatch (params, g) {
  if (!params || !params.length) {
    return
  }
  var sparql = 'DELETE DATA { \n'
  for (var i = 0; i < params.length; i++) {
    var param = params[i]
    if (param.mtime) {
      sparql += $rdf.sym(param.base) + ' '
      sparql += $rdf.sym('http://www.w3.org/ns/ldp#contains') + ' '
      sparql += $rdf.sym(param.uri) + ' .\n'

      sparql += $rdf.sym(param.uri) + ' '
      sparql += $rdf.sym('http://www.w3.org/ns/posix/stat#mtime') + ' '
      sparql += param.mtime
      sparql += ' .\n'
    } else {
      sparql += $rdf.sym(param.base + '#this') + ' '
      sparql += $rdf.sym('http://purl.org/ontology/pbo/core#playlist_slot') + ' '
      sparql += $rdf.sym(param.obj) + ' .\n'

      var sts = g.statementsMatching($rdf.sym(param.obj))
      for (var i = 0; i < sts.length; i++) {
        var st = sts[i]
        sparql += st.toString()
        debug(st.toString())
      }

/*
      sparql += $rdf.sym(param.obj) + ' '
      sparql += $rdf.sym('http://purl.org/ontology/olo/core#index') + ' '
      sparql += '' + param.index + ''
      sparql += ' .\n'

      sparql += $rdf.sym(param.obj) + ' '
      sparql += $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') + ' '
      sparql += $rdf.sym('http://purl.org/ontology/pbo/core#PlaylistSlot')
      sparql += ' .\n'
      */

    }
  }

  sparql += ' }\n'

  return sparql
}
