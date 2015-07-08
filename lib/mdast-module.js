module.exports = attacher

var visitNodes = require('./visit-nodes.js')
var resolve    = require('resolve')
var path       = require('path')

function attacher(md, onfile) {
  return transformer

  function transformer(ast, file, next) {
    var exports = []
    var imports = []
    var anchors = []
    var links = []
    var defs = []

    visitNodes(ast, [], onnode)
    onfile(file, {exports, imports, anchors, links, defs, root: ast}, next)

    function onnode(node, parents) {
      if (node.type === 'linkReference') {
        links.push(node)
        return
      }
      if (node.type === 'definition') {
        defs.push(node)
        return
      }
      if (node.type !== 'link' || node.href[0] !== '!') {
        return
      }

      var bits = node.href.split(' ', 1)
      switch (bits[0]) {
        case '!comment': {
          REMOVE_CHILD(parents, node)
        } return
        case '!import': {
          imports.push(parseImport(node, file))
          REMOVE_CHILD(parents, node)
        } return
        case '!export': {
          exports.push(parseExport(node, file))
          REMOVE_CHILD(parents, node)
        } return
        case '!anchor': {
          anchors.push(parseAnchor(node, file, parents))
          REMOVE_CHILD(parents, node)
        } return
      }
    }
  }
}


function parseImport(node, file) {
  var txt = node.href.slice('!import'.length).replace(/^\s+/, '')
  var idx = 0
  var quote = txt[idx++]
  var filename = []
  while (txt[idx] !== quote) {
    filename.push(txt[idx])
    if (txt[idx++] === '\\') {
      filename.push(txt[idx++])
    }
    if (idx >= txt.length) {
      file.fail('unexpected end of import', node.position)
      return {}
    }
  }
  txt = txt.slice(idx + 1).replace(/^\s+as\s+/, '')
  var localNameMatch = /^[\w-]+/.exec(txt)
  if (!localNameMatch) {
    file.fail('bad import name: ' + txt, node.position)
    return {}
  }
  var localName = localNameMatch[0]
  txt = txt.slice(localName.length)
  if (!/\s*$/.test(txt)) {
    file.fail('trailing chars in import: ' + txt, node.position)
  }
  var originalText = filename.join('')

  try {
    filename = resolve.sync(originalText, {
      basedir: path.dirname(file.filePath()),
      extensions: ['.md', '.markdown'],
      packageFilter: pkgfilter
    })
  } catch(err) {
    file.warn(
      'import "' + originalText + '" does not exist',
      node.position)
  }

  return {
    position: node.position,
    filename: filename,
    name: localName,
    asAuthored: originalText,
    file: file
  }
}


function parseExport(node, file) {
  var txt = node.href.slice('!export'.length).replace(/^\s+/, '')
  var localNameMatch = /^[\w-]+/.exec(txt)
  if (!localNameMatch) {
    file.fail('bad import name: ' + txt, node.position)
    return {}
  }
  var localName = localNameMatch[0]
  txt = txt.slice(localName.length)
  if (!/\s*$/.test(txt)) {
    file.fail('trailing chars in export: ' + txt, node.position)
  }
  return {name: localName, position: node.position}
}


function parseAnchor(node, file, parents) {
  var current = parents.length - 1
  while (current) {
    if (/(paragraph|heading|root)/.test(parents[current].type)) {
      break
    }
    --current
  }
  var txt = node.href.slice('!anchor'.length).replace(/^\s+/, '')
  var localNameMatch = /^[\w-]+/.exec(txt)
  if (!localNameMatch) {
    file.fail('bad import name: ' + txt, node.position)
    return {}
  }
  var localName = localNameMatch[0]
  txt = txt.slice(localName.length)
  if (!/\s*$/.test(txt)) {
    file.fail('trailing chars in export: ' + txt, node.position)
  }

  parents[current].attributes = parents[current].attributes || {}
  parents[current].attributes.id = (parents[current].attributes.id || '') + ' ' +
    localName
  return localName
}


function REMOVE_CHILD(parents, node) {
  var parent = parents[parents.length - 1]
  parent.children.splice(parent.children.indexOf(node), 1)
}


function pkgfilter(pkg, pkgFile) {
  if (pkg.docs) {
    pkg.main = pkg.docs
  }
  return pkg
}
