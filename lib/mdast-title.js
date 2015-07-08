'use strict'

module.exports = attacher

var visitNodes = require('./visit-nodes.js')
var mdast      = require('mdast')

function attacher(md) {
  var values = []
  return transformer

  function transformer(ast, file, next) {
    var lastDepth = Infinity
    var heading = 'Untitled'
    visitNodes(ast, [], onnode)
    file.title = heading
    next()

    function onnode(node, parents) {
      if (node.type !== 'heading') {
        return
      }
      if (node.depth < lastDepth) {
        lastDepth = node.depth

        values.length = 0
        visitNodes(node, [], gettext)
        heading = values.join('')
        return false
      }
    }
  }

  function gettext(node, parents) {
    if (node.value) values.push(node.value)
  }
}
