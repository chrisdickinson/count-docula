# count-docula

A documentation generator based on mdast. It provides backwards-compatible
markdown syntax for exporting, importing, and declaring links.

## Table of Contents

## For Authors:

### Introduction & Example

```markdown
[](!comment
  count docula adds four directives, which take the form
  of empty inline links. The first directive is "comment",
  which simply ignores the rest of the link.

anchor:

  The next directive is "anchor", which lets the author
  explicitly name a deep link within their document. The
  id attribute of the nearest block element is augmented
  with the new, user-defined id:
)

## Some very-complicated heading [](!anchor easy-anchor)

Some prose text. It'd be great to link directly to a paragraph
within this text, wouldn't it? [](!anchor my-prose)

[](!comment

export:

  To make your local links available to other documents, you
  can export them (like `exports.abcdef = value` in Node.) All
  anchors are "hoisted", so you can export an anchor before its
  defined.
)

[](!export easy-anchor)
[](!export some-future-defined-anchor)
This is okay too! [](!anchor some-future-defined-anchor)

You can even use these anchors with ref-links, [like so][easy-anchor].

[](!comment

import:

  To access another document's links, you can import it! The
  import resolution works *exactly* like Node's.
)

[](!import "./some/other/document.md" as other-doc)

You can [link to][other-doc.some-inner-link] the other doc's anchors.
You can even use the name to link to [the doc itself][other-doc].
```

### Command Line Interface

### Common Errors

## For Builders:

### Setting Up A Docs Dir

### Configuration

### Layouts

## Contributing

## License
