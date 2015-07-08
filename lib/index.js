'use strict'

var modules      = require('./mdast-module.js')
var getTitle     = require('./mdast-title.js')
var File         = require('mdast/lib/file')
var gracefulFS   = require('graceful-fs')
var lint         = require('mdast-lint')
var rhtml        = require('mdast-html')
var runBuild     = require('./build.js')
var ls           = require('ls-stream')
var toc          = require('mdast-toc')
var runTest      = require('./test.js')
var minimist     = require('minimist')
var mdast        = require('mdast')
var path         = require('path')
var fs           = require('fs')

module.exports = main

if (require.main === module) {
  main(process.argv, function (err) {
    if (err) {
      if (process.env.DEBUG) {
        console.error(err.stack)
      }
      return process.exit(err.code || 1)
    }
  })
}

function main(argv, ready) {
  argv = minimist(argv.slice(2))

  var cmd = argv._[0]
  var src = path.resolve(argv.src || argv._[1])

  argv.src = src

  var dents = []
  var cache = new Map()
  var md = mdast()
  var oncomplete = cmd === 'test' ? runTest : runBuild
  md = md.use(toc).use(getTitle)

  if (cmd === 'test') {
    try {
      var options = fs.readFileSync(path.join(src, '.mdastrc'), 'utf8')
      options = JSON.parse(options)
    } catch (err) {
      options = {}
    }
    md = md.use(lint, (options.plugins || {}).lint || {})
    md = md.use(modules, onfile)
  } else {
    md = md.use(modules, onfile)
    md = md.use(rhtml)
  }

  ls(gracefulFS, src)
    .once('error', ready)
    .on('data', ondata)
    .on('end', onend)

  function ondata(dent) {
    if (/.m(arkdown|d)$/.test(path.extname(dent.path)) &&
        dent.stat.isFile()) {
      dents.push(dent)
    }
  }

  function onend() {
    var pending = dents.length
    dents.forEach(function(dent) {
      processFile(dent.path, onready)
    })

    function onready() {
      // noop!
      !--pending && done()
    }

    function done() {
      return oncomplete(dents, cache, argv, ready)
    }
  }

  function getAbsoluteURL(filePath) {
    filePath = filePath.slice(src.length)
    if (filePath[0] !== '/') {
      filePath = '/' + filePath
    }
    var ext = path.extname(filePath)

    return filePath.slice(0, filePath.length - ext.length) + '.html'
  }

  function processFile(filePath, ready) {
    if (cache.has(filePath)) {
      return ready()
    }
    gracefulFS.readFile(filePath, 'utf8', function(err, data) {
      if (err) {
        return ready(err)
      }
      var ext = path.extname(filePath).slice(1)
      var file = new File({
        directory: path.dirname(filePath),
        filename: path.basename(filePath).slice(0, -ext.length - 1),
        extension: ext,
        contents: data
      })
      file.quiet = true
      md.process(file, function(err, data) {
        if (cache.has(filePath)) {
          cache.get(filePath).result = {
            data: data,
            file: file
          }
        }
        ready(null, data, filePath)
      })
    })
  }

  function onfile(richFile, info, ready) {
    var exportCache = cache.get(richFile.filePath())
    var missingNames = new Set

    var url = getAbsoluteURL(richFile.filePath())
    if (!exportCache) {
      var importFiles = info.imports.map(function(xs) {
        return xs.filename
      })

      exportCache = {exports: {}, imports: importFiles, url: url}
      cache.set(richFile.filePath(), exportCache)
    } else {
      // we've already been visited!
      return ready()
    }

    info.exports.forEach(function(obj) {
      if (exportCache.exports[obj.name]) {
        richFile.warn('duplicate export: ' + obj.name)
      }
      exportCache.exports[obj.name] = url + '#' + obj.name
    })

    info.anchors.forEach(function(name) {
      var def = {
        type: 'definition',
        identifier: name,
        title: null,
        link: '#' + name
      }
      info.root.children.push(def)
      info.defs.push(def)
    })

    var pending = info.imports.length

    if (!pending) {
      return done()
    }

    info.imports.forEach(function(importObject, idx) {
      var result = cache.get(importObject.filename)
      if (result) {
        return !--pending && done()
      }
      processFile(importObject.filename, function(err) {
        if (err) {
          richFile.warn(
            'failed to import "' + importObject.asAuthored + '"',
            importObject.position)
          missingNames.add(importObject.name)
        }
        !--pending && done()
      })
    })

    // actually let the errors bubble
    function done() {
      setImmediate(process)
    }

    function process() {
      var linkNames = new Set()
      for (var i = 0; i < info.imports.length; ++i) {
        var exports = cache.get(info.imports[i].filename)
        var name = info.imports[i].name

        if (!exports) continue

        var anchors = exports.exports
        for (var key in anchors) {
          var def = {
            type: 'definition',
            identifier: name + '.' + key,
            title: null,
            link: anchors[key]
          }
          info.root.children.push(def)
          info.defs.push(def)
        }

        var def = {
          type: 'definition',
          identifier: name,
          title: null,
          link: exports.url
        }
        info.root.children.push(def)
        info.defs.push(def)
      }



      // make sure that: all links have references
      // make sure that: all exports point to a named anchor
      for (var i = 0; i < info.defs.length; ++i) {
        linkNames.add(info.defs[i].identifier)
      }

      for (var i = 0; i < info.exports.length; ++i) {
        if (!linkNames.has(info.exports[i].name)) {
          richFile.warn(
            `Failed to export unknown anchor ${info.exports[i].name}.`,
            info.exports[i].position
          )
        }
      }

      for (var i = 0; i < info.links.length; ++i) {
        if (!linkNames.has(info.links[i].identifier)) {
          richFile.warn(`Unknown link identifier "${info.links[i].identifier}"`, info.links[i].position)
        }
      }

      ready()
    }
  }
}
