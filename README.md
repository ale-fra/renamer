[![view on npm](https://badgen.net/npm/v/renamer)](https://www.npmjs.org/package/renamer)
[![npm module downloads](https://badgen.net/npm/dt/renamer)](https://www.npmjs.org/package/renamer)
[![GitHub repo dependents](https://badgen.net/github/dependents-repo/75lb/renamer)](https://github.com/75lb/renamer/network/dependents?dependent_type=REPOSITORY)
[![GitHub package dependents](https://badgen.net/github/dependents-pkg/75lb/renamer)](https://github.com/75lb/renamer/network/dependents?dependent_type=PACKAGE)
[![Node.js CI](https://github.com/ale-fra/renamer/actions/workflows/node.js.yml/badge.svg)](https://github.com/ale-fra/renamer/actions/workflows/node.js.yml)

***Upgrading from v5? Please read the [v6 release notes](docs/release-notes-v6.md). Release notes for all versions are [on GitHub](https://github.com/75lb/renamer/releases). Please share feedback and improvement ideas [here](https://github.com/75lb/renamer/discussions).***

# renamer

Renamer is a command-line tool for renaming files and folders in bulk. It is flexible and extensible via plugins, and can also be used as a JavaScript or TypeScript library. Type definitions are included.

> **Warning:** always run renamer with the `--dry-run` option until you are confident the results look correct.

**Contents:** [Install](#install) · [Usage](#usage) · [Plugins](#plugins) · [Views](#views) · [API](#api) · [TypeScript](#typescript) · [Troubleshooting](#troubleshooting) · [Further reading](#further-reading) · [Development](#development)

## Install

Renamer requires [Node.js](https://nodejs.org/en/) v22.18 or above.

To install renamer globally as a part of your regular command-line tool kit:

```
$ npm install --global renamer
```

To install renamer as a development dependency of your project:

```
$ npm install --save-dev renamer
```

## Usage

As input, renamer takes a list of file names or glob patterns plus some options describing how you would like the files to be renamed. Run `renamer --help` for the full list of options.

```
$ renamer [options] [file...]
```

This trivial example replaces the text `jpeg` with `jpg` in all file and folder names in the current directory.

```
$ renamer --find jpeg --replace jpg *
```

As above but operates on all files and folders recursively. Quoting the pattern passes it to renamer rather than letting the shell expand it.

```
$ renamer --find jpeg --replace jpg "**"
```

Files are renamed before the folders containing them, deepest first.

_The examples use double quotes, which work in every shell including the Windows command prompt. On macOS and Linux, prefer single quotes for values containing `$`, such as `--replace '$1.log'`, as the shell expands `$1` inside double quotes._

An option value beginning with a hyphen must be given in the `--option=value` form, otherwise it is read as an option: use `--replace=-copy` rather than `--replace "-copy"`.

### Choose which files to process

If no file names or patterns are specified, renamer reads a newline-separated list of file names from standard input. This is useful for crafting a specific input list using tools like `find`. This example operates on files modified less than 20 minutes ago.

```
$ find . -mtime -20m | renamer --find jpeg --replace jpg
```

Same again but with a hand-rolled list of file names and glob patterns. Create an input text file, e.g. `files.txt`:

```
house.jpeg
garden.jpeg
img/*
```

Then pipe it into renamer.

```
$ cat files.txt | renamer --find jpeg --replace jpg
```

### Rename using regular expressions

This example uses a [regular expression literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions). The case-insensitive pattern `/one/i` matches the input file `ONE.jpg`, renaming it to `two.jpg`.

```
$ renamer --find "/one/i" --replace "two" ONE.jpg
```

The `--find` value is treated as a regular expression only if the whole value is a literal: a slash, the pattern, a slash and optional flags. Any other value, for example `x/on/`, is a plain string.

Only the first match is replaced, for example `--find o --replace a` renames `ooo` to `aoo`. To replace every match, use a regular expression with the `g` flag: `--find "/o/g"`.

### Rename part of the path

By default, renamer finds and replaces within the file name including its extension (the `base`). Use `--path-element` to operate on just the `name` or the `ext`. For example, to change the extension of every `.jpeg` file:

```
$ renamer --path-element ext --replace ".jpg" "*.jpeg"
```

If `--find` is omitted, the whole path element is replaced. The folder part of a path is never changed.

### Number files

Use the `{{index}}` token in the replace string to insert a number which increments for each file. This example renames every JPEG to `image-001.jpg`, `image-002.jpg` etc.

```
$ renamer --dry-run --path-element name --replace "image-{{index}}" --index-format %03d "*.jpg"

Dry run

✔︎ ONE.jpg → image-001.jpg
✔︎ pic1.jpg → image-002.jpg
✔︎ pic2.jpg → image-003.jpg

Rename complete: 3 of 3 files renamed.
```

Set `--index-root` to start counting from a value other than 1. Files are numbered in the order given or, for a glob pattern, in natural order (`file2` before `file10`).

## Plugins

Renamer passes each file name through a chain of plugins, each one modifying the output of the previous one. The default chain is `find-replace` (the `--find`, `--replace` and `--path-element` options) then `index-replace` (the `{{index}}` token). Use `--chain` to supply your own.

For more complex renames, or if you just prefer using code, write a [replace chain plugin](https://github.com/75lb/renamer/wiki/How-to-write-a-replace-chain-plugin): a module exporting a class with a `replace` method. This trivial example appends the text `[DONE]` to each file name.

```js
import path from 'node:path'

class Suffix {
  replace (filePath) {
    const file = path.parse(filePath)
    const newName = file.name + ' [DONE]' + file.ext
    return path.join(file.dir, newName)
  }
}

export default Suffix
```

Save the above as `suffix.js` then process all JPEG files in the current directory using the plugin as the replace chain.

```
$ renamer --dry-run --chain suffix.js "*.jpg"

Dry run

✔︎ pic1.jpg → pic1 [DONE].jpg
✔︎ pic2.jpg → pic2 [DONE].jpg

Rename complete: 2 of 2 files renamed.
```

Set `--chain` more than once to build a longer chain, e.g. `--chain suffix.js --chain find-replace`. Plugins can also define a description and their own command-line options, which are listed by `renamer --chain suffix.js --help`. See the [examples](example/chain) and the [`Plugin` type](docs/API.md#plugin).

## Views

The following gif demonstrates the default view (with and without `--verbose`), the built-in alternative views (`--view long`, `--view diff` and `--view one-line`) and a [custom view](example/view).

<img src="https://i.imgur.com/7830Y9N.gif" width="620px" title="Renamer views demo">

A custom view is a module exporting a class with a `write` method: load it with `--view path/to/view.js`. The built-in views are exported too, so a custom view can extend one. See the [examples](example/view), the [`View` type](docs/API.md#view) and the [built-in views](docs/API.md#built-in-views).

## API

Renamer can be used as a library. It accepts the same options as the command line, in camel-case.

```js
import Renamer from 'renamer'

const renamer = new Renamer()
const results = await renamer.rename({
  files: ['pics/*'],
  find: 'pic',
  replace: 'photo',
  dryRun: true
})
console.log(results)
```

Use `renamer.results()` instead to process the renames one at a time. See the [API documentation](docs/API.md) and the [examples](example/api).

## TypeScript

Type definitions are included, see the [API documentation](docs/API.md) for the full list of exported types.

```ts
import Renamer from 'renamer'
import type { RenamerOptions, ReplaceResult } from 'renamer'

const options: RenamerOptions = { files: ['pics/*'], find: /pic/, replace: 'photo', dryRun: true }
const results: ReplaceResult[] = await new Renamer().rename(options)
for (const result of results) {
  if (result.renamed) {
    console.log(`${result.from} → ${result.to}`)
  }
}
```

Plugins and views may be written in TypeScript too. With renamer installed in your project (for the types), save this plugin as `suffix.ts`:

```ts
import path from 'node:path'
import type { OptionDefinition, Plugin, ReplaceOptions } from 'renamer'

class Suffix implements Plugin {
  description (): string {
    return 'Appends a suffix to each file name.'
  }

  optionDefinitions (): OptionDefinition[] {
    return [
      { name: 'suffix', type: String, description: 'The suffix to append.', defaultValue: ' [DONE]' }
    ]
  }

  replace (filePath: string, options: ReplaceOptions): string {
    /* Option defaults only apply on the command line: via the API, an unset option is undefined */
    const suffix = typeof options.suffix === 'string' ? options.suffix : ''
    const file = path.parse(filePath)
    return path.join(file.dir, file.name + suffix + file.ext)
  }
}

export default Suffix
```

Then use it directly, no build step needed:

```
$ renamer --dry-run --chain suffix.ts --suffix " (final)" "*.jpg"
```

Node.js runs TypeScript files by stripping their types, so plugin and view files must only use [erasable syntax](https://nodejs.org/api/typescript.html#type-stripping), which rules out `enum` and `namespace`, for example. Node.js does not strip types from files inside `node_modules`, so plugins published as packages must be compiled to JavaScript. Every [example](example) is available in both JavaScript and TypeScript.

## Troubleshooting

### Symbols are displayed as `�` or other garbled characters

Renamer marks each file with a symbol, such as `✔︎ pic1.jpg → photo1.jpg`. These Unicode symbols are only used if your locale is UTF-8, going by the first of the `LC_ALL`, `LC_CTYPE` and `LANG` environment variables which is set. Otherwise, for example if none is set, renamer uses ASCII: `+ pic1.jpg -> photo1.jpg` (and `-` for a file which was not renamed).

If you still see garbled symbols, your locale specifies UTF-8 but the terminal is not decoding UTF-8. Either set the terminal's character encoding to UTF-8, or force ASCII output:

```
$ LC_ALL=C renamer --dry-run --find pic --replace photo "*.jpg"
```

To get the Unicode symbols in a terminal which supports UTF-8 but has no locale set, set one, e.g. `export LANG=C.UTF-8`.

## Further reading

Please see [the wiki](https://github.com/75lb/renamer/wiki) for

* [Usage examples](https://github.com/75lb/renamer/wiki/examples).
* More information about [using plugins](https://github.com/75lb/renamer/wiki/How-to-use-replace-chain-plugins) and [writing plugins](https://github.com/75lb/renamer/wiki/How-to-write-a-replace-chain-plugin).
* The [full list of command-line options](https://github.com/75lb/renamer/wiki/Renamer-CLI-docs), also printed by `renamer --help`.

For more information on regular expressions, see [this useful guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).

## Development

Renamer is written in TypeScript. Node.js v22.18 or above runs the sources directly, so no build step is needed during development.

```
$ npm ci             # install the pinned dependencies
$ npm test           # type-check, run the test suite and print a report
$ npm run build      # compile to dist/ (run automatically by npm pack and npm publish)
$ npm run test:package # pack, install in isolation, check the CLI, API and public types
```

Run a subset of the tests with `node scripts/test.ts test/cli.ts`, and the command line from source with `node bin/cli.ts`. Each run ends with a report of the number of tests run, passed, failed and skipped; the details of any failure are listed above it.

`npm run test:e2e` builds the package, then runs the built command in a new temporary directory: a dry run then a real rename of ten files, checking the exit codes, the output and the files at each step. It ends with a recap of the checks and a report, and keeps the directory so you can inspect the results. The published package contains only the compiled JavaScript and type declarations in `dist/`.

The test suite also checks the documentation: every export is documented, signatures and code examples compile, and links resolve. See [example/README.md](example/README.md) for running the examples.

* * *

Released under the [MIT License](LICENCE).
