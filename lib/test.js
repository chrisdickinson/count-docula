'use strict'

var compact = require('eslint/lib/formatters/compact')
var File    = require('mdast/lib/file')
var path    = require('path')

module.exports = runTest

function runTest(dents, cache, argv, ready) {
  var files = []
  var src = argv.src

  var cwd = process.cwd()
  var hasImports = new Set()
  var srcFile = new File({
    directory: path.relative(cwd, path.dirname(src)),
    filename: path.basename(src),
    extension: ''
  })
  srcFile.quiet = true
  files.push(srcFile)

  for (var tuple of cache) {
    var file = tuple[1].result.file
    var imports = tuple[1].imports
    for (var i = 0; i < imports.length; ++i) {
      hasImports.add(imports[i])
    }

    file.directory = path.relative(cwd, file.directory)
    files.push(file)
  }

  var noImports = new Set()
  for (var i = 0; i < dents.length; ++i) {
    if (!hasImports.has(dents[i].path)) {
      noImports.add(dents[i].path)
    }
  }

  if (noImports.size > 1) {
    var importNames = []
    for (var xs of noImports) {
      importNames.push(path.relative(cwd, xs))
    }
    srcFile.fail('Potentially orphaned document! ' +
      'The following documents have no incoming links:' +
      `\n  ${importNames.join(`\n  `)}`)
  }

  var result = compact(files)

  if (result) {
    console.error(result)
    var err = new Error('encountered errors')
    err.code = 1
    return ready(err)
  }
  return ready()
}
