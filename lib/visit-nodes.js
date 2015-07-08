'use strict'

module.exports = visitNodes

function visitNodes(current, parents, fn) {
  if (fn(current, parents) === false) {
    return
  }
  if (current.children) {
    parents.push(current)
    var children = current.children.slice()
    for (var i = 0; i < children.length; ++i) {
      visitNodes(children[i], parents, fn)
    }
    parents.pop(current)
  }
}
