'use strict'

module.exports = runBuild

var gracefulFS = require('graceful-fs')
var handlebars = require('handlebars')
var mkdirp     = require('mkdirp')
var path       = require('path')
var once       = require('once')

var builtinDefault = path.join(__dirname, 'default.html')

function runBuild(dents, cache, argv, ready) {
  var dirs = []
  var src = argv.src
  var dst = path.resolve(argv.dst || argv._[2])

  ready = once(ready)

  for (var tuple of cache) {
    var fullPath = tuple[0]
    var meta = tuple[1]

    var file = meta.result.file
    var data = meta.result.data

    if (file.hasFailed()) {
      continue
    }

    var dir = path.relative(src, file.directory)
    if (dir.slice(0, 2) == '..') {
      // XXX: "resolve" could have linked us to a parent module,
      // handle that some other way at some point, somehow.
      continue
    }

    file.move({
      directory: path.join(dst, dir),
      extension: 'html'
    })

    file.contents = data
    dirs.push(file.directory)
  }

  var pending = 2
  var seen = new Set()
  var tplMap = null

  loadDirs(dirs, function (err) {
    if (err) {
      return ready(err)
    }
    !--pending && writeFiles()
  })

  var defaultTpl = argv.template || builtinDefault
  loadTemplates(defaultTpl, cache, function (err, _tplMap) {
    if (err) {
      return ready(err)
    }
    tplMap = _tplMap
    !--pending && writeFiles()
  })

  function writeFiles() {
    pending = 0
    for (var tuple of cache) {
      var filePath = tuple[0]
      var info = tuple[1]
      var tpl = tplMap.get(filePath)
      var data = tpl(info.result)
      var targetPath = info.result.file.filePath()
      ++pending

      gracefulFS.writeFile(targetPath, data, onfile)
    }
  }

  function onfile(err) {
    if (err) {
      return ready(err)
    }
    !--pending && ready()
  }
}

function loadTemplates(defaultTpl, cache, ready) {
  ready = once(ready)

  defaultTpl = path.resolve(process.cwd(), defaultTpl)
  var templates = new Map([[defaultTpl, []]])
  var reversed = new Map()
  for (var tuple of cache) {
    var fullPath = tuple[0]
    var meta = tuple[1]

    var file = meta.result.file
    var tpl = file.template

    if (tpl) {
      tpl = path.resolve(path.dirname(fullPath), tpl)
    } else {
      tpl = defaultTpl
    }

    if (!templates.has(tpl)) {
      templates.set(tpl, [])
    }
    templates.get(tpl).push(fullPath)
  }

  var pending = templates.size
  templates.forEach(function (xs, key) {
    gracefulFS.readFile(key, 'utf8', function (err, data) {
      if (err) {
        return ready(new Error(
          'could not load template "'+ key + '", required by "' +
          xs.join('", "') + '"'))
      }
      var items = templates.get(key)
      var tpl = handlebars.compile(data)
      for (var i = 0; i < items.length; ++i) {
        reversed.set(items[i], tpl)
      }

      !--pending && ready(null, reversed)
    })
  })
}

function loadDirs(dirs, ready) {
  ready = once(ready)

  var pending = 0
  var seen = new Set()
  dirs = dirs.sort(function (lhs, rhs) {
    return lhs < rhs ? 1 :
      lhs > rhs ? -1 : 0
  })

  dirs.forEach(eachDir)

  if (!pending) {
    process.nextTick(ready)
  }

  return
    
  function eachDir(dir) {
    if (seen.has(dir)) {
      return
    }
    seen.add(dir)
    var alsoSeen = dir.split(path.sep)
    while(alsoSeen.length) {
      seen.add(alsoSeen.join(path.sep))
      alsoSeen.pop()
    }
    ++pending
    mkdirp(dir, ondir)
  }

  function ondir(err) {
    if (err) return ready(err)

    !--pending && ready()
  }
}
