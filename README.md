# count-docula

A documentation generator based on mdast. It provides backwards-compatible
markdown syntax for exporting, importing, and declaring links.

## Table of Contents

-   [For Authors:](#for-authors)

    -   [Introduction & Example](#introduction--example)

        -   [`[](!anchor my-anchor-name)`](#anchor-my-anchor-name)
        -   [`[](!export my-anchor-name)`](#export-my-anchor-name)
        -   [`[](!import "./path/to/document.md" as local-name)`](#import-pathtodocumentmd-as-local-name)

    -   [Command Line Interface](#command-line-interface)

    -   [Common Errors](#common-errors)

-   [For Builders:](#for-builders)

    -   [Setting Up A Docs Dir](#setting-up-a-docs-dir)
    -   [Configuration](#configuration)
    -   [Layouts](#layouts)

-   [Contributing](#contributing)

-   [License](#license)

## For Authors:

### Introduction & Example

Count Docula adds three directives, which take the form of empty inline links,
like so:

```markdown
[](!import "./path/doc.md" as filename)
[](!anchor my-anchor-name)
[](!export my-anchor-name)
```

The directives are used to _declare dependencies_ on other documents and import
the anchors they export for linking.

#### `[](!anchor my-anchor-name)`

The `anchor` directive allows authors to explicitly give block-level elements a
well-known "id" attribute. It solves the following problems:

-   Having to guess how a heading's text will be turned into an anchor.
-   Being able to deep-link to non-heading elements, like block quotes and
    paragraphs.

It will add the user-supplied anchor name to the closest surrounding block
element, and will be available for _reference links_. For example:

```markdown
This is a very descriptive paragraph that I'd like to reference. It's
incredible the amount of care and attention it took to write. I am
amazed. [](!anchor my-amazing-paragraph)

Have you seen [this paragraph?][my-amazing-paragraph] It's a really good
paragraph.
```

These anchors are **hoisted** — they will be collected before any further
steps are run on the markdown source. As such you can use them in reference
links before they're defined, or pass them to the `export` directive.

```markdown
[](!export the-suspense)

Get ready for a [mind-blowing experience][the-suspense].

### Boo. [](!anchor the-suspense)
```

Anchors will be checked for uniqueness when running `count-docula test`.

#### `[](!export my-anchor-name)`

Anchors declared with the `anchor` directive may be exported for other
documents to use using the `export` directive.

```markdown
[](!export my-link)

### Oh look, I'd like folks to link to me [](!anchor my-link)

It's okay to export after the fact too. [](!anchor an-example)

[](!export an-example)
```

#### `[](!import "./path/to/document.md" as local-name)`

The `import` directive will make a document (and all of its exported
anchors) available for linking in the local document under the name
provided.

Like the other directives, `import` directives are hoisted and may
follow links used from them.

To use a link from another document, refer to it using `localname.inner-link`:

```markdown
[](!import "./path/to/doc.md" as other-doc)

I'd like to link to a subsection of [this other doc][other-doc.subsection].
```

These inner links will be verified by `count-docula test`.

You may link to the other document by referring to the name directly:

```markdown
[](!import "./path/to/doc.md" as other-doc)

Check out this [sweet document][other-doc].
```

### Command Line Interface

### Common Errors

## For Builders:

### Setting Up A Docs Dir

### Configuration

### Layouts

## Contributing

## License
