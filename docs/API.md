# renamer API

Rename files in bulk from JavaScript or TypeScript. The package has a single entry point, `renamer`, which exports:

* the [`Renamer`](#renamer) class (the default export),
* the [built-in plugins](#built-in-plugins) and [built-in views](#built-in-views), for use in a replace chain or as base classes,
* types for everything documented below.

```js
import Renamer from 'renamer'

const renamer = new Renamer()
const results = await renamer.rename({ files: ['pics/*'], find: 'pic', replace: 'photo', dryRun: true })
```

Requires Node.js v22.18 or above.

## Contents

* [Renamer](#renamer)
  * [renamer.rename(options)](#renamerrenameoptions)
  * [renamer.results(options)](#renamerresultsoptions)
  * [Errors](#errors)
* Options: [`RenamerOptions`](#renameroptions), [`ReplaceOptions`](#replaceoptions), [`FindPattern`](#findpattern), [`Replacement`](#replacement), [`PathElement`](#pathelement)
* Results: [`ReplaceResult`](#replaceresult), [`RenamedResult`](#renamedresult), [`UnchangedResult`](#unchangedresult), [`RenameStats`](#renamestats)
* Plugins: [`Plugin`](#plugin), [`PluginClass`](#pluginclass), [`PluginReference`](#pluginreference), [`OptionDefinition`](#optiondefinition)
* Built-in plugins: [`FindReplace`](#findreplace), [`IndexReplace`](#indexreplace)
* Views: [`View`](#view), [`ViewWriteArgs`](#viewwriteargs), [`ViewEventMap`](#vieweventmap), [`ViewEvent`](#viewevent), [`ViewClass`](#viewclass), [`CliOptions`](#clioptions)
* Built-in views: [`DefaultView`](#defaultview), [`LongView`](#longview), [`DiffView`](#diffview), [`OneLineView`](#onelineview)
* Low-level: [`RenameFileOptions`](#renamefileoptions), [`TargetExistsError`](#targetexistserror)

## Renamer

```ts
class Renamer {
  rename (options?: ReplaceOptions): Promise<ReplaceResult[]>
  results (options?: ReplaceOptions): AsyncGenerator<ReplaceResult, void, undefined>
}
```

The constructor takes no arguments. Each call to `rename()` or `results()` is an independent run.

For each run, renamer:

1. Expands `options.files` into a list of files and directories. Paths are kept in the order given; the matches of each glob pattern are sorted into natural order (`file2` before `file10`). Files come first, then directories, deepest first. This is why a folder's contents are renamed before the folder itself.
2. Loads the replace chain (`options.chain`).
3. Passes every path through the chain to compute its new path. Nothing is renamed until every new path has been computed.
4. Renames each file whose path changed, in order. A file is never renamed over an existing path unless `options.force` is set. With `options.dryRun`, the same checks are made but nothing is renamed, including a check that no two files in the run would be renamed to the same path.

### renamer.rename(options)

Renames the files, resolving to one [`ReplaceResult`](#replaceresult) per file or directory processed, in the order they were processed.

```js
const results = await renamer.rename({ files: ['*.jpeg'], find: 'jpeg', replace: 'jpg' })
```

### renamer.results(options)

The same as `rename()`, but returns an async iterator which yields each result after that file has been renamed. Useful for reporting progress.

```js
for await (const result of renamer.results({ files: ['*.jpeg'], find: 'jpeg', replace: 'jpg' })) {
  console.log(result)
}
```

### Errors

`rename()` rejects, and `results()` throws from the iterator, with one of these errors or any error thrown by a plugin:

| Error message | Cause | Files renamed before the error? |
| --- | --- | --- |
| `These paths or patterns do not exist: …` | A path or glob pattern in `files` matched nothing | No |
| `plugin could not be found: …` | A plugin name in `chain` could not be resolved | No |
| `Invalid plugin: plugin module must export a class` | A plugin module's default export is not a class | No |
| `Invalid plugin: plugin class must implement a replace method` | A chain item has no `replace` method | No |
| `Invalid plugin: <Name>.replace() must return a string` | A plugin returned something other than a string | No |
| ``Please specify a value for `find` and/or `replace` `` | find-replace plugin: neither `find` nor `replace` was set | No |
| `Invalid path element: …` | find-replace plugin: `pathElement` is not `base`, `name` or `ext` | No |
| `Replace resulted in empty filename. …` | find-replace plugin: the new file name would be empty | No |
| `Unable to rename <from> to <to> [file exists]` | A [`TargetExistsError`](#targetexistserror), `code: 'exists'`: the target exists (or, in a dry run, is already the target of another file) and `force` is not set | Yes |
| Errors from `fs.rename()`, e.g. `EACCES` | The rename failed | Yes |

Renames are not transactional. If a rename fails, the run stops: earlier files stay renamed and later files are not processed. With `results()`, every result yielded before the error describes a completed rename.

## Options

### `RenamerOptions`

The options for a run. All are optional.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `files` | `string \| string[]` | | One or more file paths, directory paths or glob patterns to process. |
| `dryRun` | `boolean` | `false` | Do everything except rename the files. You should always set this until certain the results look correct. |
| `force` | `boolean` | `false` | Rename even if the target path exists, overwriting it. The main use-case is changing the case of file names on case-insensitive file systems. Use with caution. |
| `chain` | [`PluginReference`](#pluginreference) `\| PluginReference[]` | `['find-replace', 'index-replace']` | The replace chain, see [`PluginReference`](#pluginreference). |
| `find` | [`FindPattern`](#findpattern) `\| null` | | Used by the find-replace plugin: the text or pattern to find. If omitted, the whole path element is replaced. |
| `replace` | [`Replacement`](#replacement) | `''` | Used by the find-replace plugin: the replacement. May contain the `{{index}}` token. |
| `pathElement` | [`PathElement`](#pathelement) | `'base'` | Used by the find-replace plugin: the part of the path to operate on. |
| `indexFormat` | `string` | `'%d'` | Used by the index-replace plugin: the printf format for `{{index}}`, e.g. `%03d` yields `001`, `002` etc. |
| `indexRoot` | `number \| string` | `1` | Used by the index-replace plugin: the first value of `{{index}}`. |

Unlike the command line, `find` is never parsed as a regular expression literal: pass a `RegExp` instance, e.g. `find: /one/i`.

`RenamerOptions` is a type alias, so an object annotated as `RenamerOptions` is still accepted where `ReplaceOptions` is expected.

### `ReplaceOptions`

```ts
type ReplaceOptions = RenamerOptions & { readonly [option: string]: unknown }
```

[`RenamerOptions`](#renameroptions) plus any options used by the plugins in the chain. This is the type accepted by `rename()` and `results()`, and the `options` passed to [`Plugin.replace()`](#plugin).

```js
import RenamerCase from 'renamer-case'

await renamer.rename({ files: ['*'], chain: [RenamerCase], case: 'camel' })
```

### `FindPattern`

```ts
type FindPattern = string | RegExp
```

A literal string or a regular expression. As with `String.prototype.replace`, only the first match is replaced unless a regular expression has the `g` flag.

### `Replacement`

```ts
type Replacement = string | ((substring: string, ...args: any[]) => string)
```

Anything accepted as the replacement by `String.prototype.replace`: a string, which may contain substitution patterns such as `$1`, or a replacer function.

```js
await renamer.rename({ files: ['*'], find: /(\w+)-(\w+)/, replace: (match, a, b) => `${b}-${a}` })
```

### `PathElement`

```ts
type PathElement = 'base' | 'name' | 'ext'
```

The part of the path to operate on. For `pics/image.jpg`, the `base` is `image.jpg`, the `name` is `image` and the `ext` is `.jpg`. The directory is never changed by the find-replace plugin.

## Results

### `ReplaceResult`

```ts
type ReplaceResult = RenamedResult | UnchangedResult
```

The outcome for one file or directory. Check `renamed` to narrow the type: `to` is a `string` only when `renamed` is `true`.

```ts
for await (const result of renamer.results(options)) {
  if (result.renamed) {
    console.log(`${result.from} → ${result.to}`)
  }
}
```

### `RenamedResult`

| Property | Type | Description |
| --- | --- | --- |
| `from` | `string` | The path before the rename. |
| `to` | `string` | The path after the rename. |
| `renamed` | `true` | |

In a dry run, `to` is the path the file would have been renamed to.

### `UnchangedResult`

| Property | Type | Description |
| --- | --- | --- |
| `from` | `string` | The original path. |
| `to` | `null` | |
| `renamed` | `false` | The replace chain returned an equivalent path. |

### `RenameStats`

The totals passed to a view's `complete` event.

| Property | Type | Description |
| --- | --- | --- |
| `total` | `number` | The number of files and directories processed. |
| `renamed` | `number` | The number renamed (or, in a dry run, that would have been renamed). |
| `notRenamed` | `number` | The number left unchanged. |

## Plugins

The replace chain is a list of plugins. Each file path is passed through the plugins in turn, each receiving the output of the previous one, and the final output is the new path. The default chain is find-replace (the `find`, `replace` and `pathElement` options) then index-replace (the `{{index}}` token).

### `Plugin`

```ts
interface Plugin {
  replace (filePath: string, options: ReplaceOptions, index: number, files: string[]): string
  description? (): string
  optionDefinitions? (): OptionDefinition[]
}
```

| Method | Description |
| --- | --- |
| `replace(filePath, options, index, files)` | Required. Return the new path for `filePath`, or `filePath` unchanged. `filePath` is the output of the previous plugin in the chain. `options` is the [`ReplaceOptions`](#replaceoptions) of the run. `index` is the position of the original file in `files`, the full list of files being processed, after glob expansion. Renamer computes the new path of every file before renaming any. |
| `description()` | Optional. A description printed in the "Replace chain" section of `renamer --help`. |
| `optionDefinitions()` | Optional. Extra command-line options used by this plugin. They are parsed and passed to `replace()` in `options`, camel-cased, and listed by `renamer --help`. A `defaultValue` is only applied on the command line: when renamer is used as a library, an option the caller did not set is `undefined`, so `replace()` should handle that. |

Plugins given by name or class are instantiated once per run, so a plugin can keep state between the files of a run (the index-replace plugin keeps its counter this way). A plugin instance in `chain` is used as-is, so its state carries over between runs.

```js
import path from 'node:path'

class Suffix {
  description () {
    return 'Appends a suffix to each file name.'
  }

  optionDefinitions () {
    return [{ name: 'suffix', type: String, description: 'The suffix to append.', defaultValue: ' [DONE]' }]
  }

  replace (filePath, options) {
    /* The default value only applies on the command line */
    const suffix = options.suffix ?? ' [DONE]'
    const file = path.parse(filePath)
    return path.join(file.dir, file.name + suffix + file.ext)
  }
}

export default Suffix
```

See [example/chain](../example/chain) and the TypeScript plugin example in the [README](../README.md#typescript).

### `PluginClass`

```ts
type PluginClass = new () => Plugin
```

A plugin class. Renamer instantiates it with no arguments. A plugin module must export a plugin class as its default export.

### `PluginReference`

```ts
type PluginReference = string | PluginClass | Plugin
```

An item in the replace chain:

* `'find-replace'` or `'index-replace'`: a built-in plugin.
* Any other string: the name of a plugin package or the path to a plugin module, which must export a plugin class as its default export. Renamer looks for a package installed in or above the current directory, then in the global npm and yarn package directories, then for a file relative to the current directory. The built-in plugins may also be referenced by file name, e.g. `find-replace.js`, if no such file exists in the current directory.
* A [`PluginClass`](#pluginclass).
* A plugin instance, used as-is.

### `OptionDefinition`

A command-line option definition, as used by [command-line-args](https://github.com/75lb/command-line-args) and [command-line-usage](https://github.com/75lb/command-line-usage).

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` | Required. The long option name, e.g. `index-format`. The parsed value is passed to plugins camel-cased, e.g. `options.indexFormat`. |
| `type` | `(input: string) => unknown` | A setter function such as `String`, `Number` or `Boolean`. Defaults to `String`. |
| `alias` | `string` | A single-character short alias, e.g. `f` for `-f`. |
| `multiple` | `boolean` | Accept multiple values, e.g. `--files one two`. |
| `lazyMultiple` | `boolean` | Accept multiple values, one per occurrence of the option, e.g. `--chain one --chain two`. |
| `defaultOption` | `boolean` | Values without an option name are assigned to this option. |
| `defaultValue` | `unknown` | The value used if the option is not set. |
| `group` | `string \| string[]` | Groups the option into one or more named groups. |
| `description` | `string` | Printed in the usage guide. |
| `typeLabel` | `string` | The type label printed in the usage guide. |

## Built-in plugins

The default replace chain is `[FindReplace, IndexReplace]`. In `chain`, refer to them by name (`'find-replace'`, `'index-replace'`) or pass the classes, which are also exported for use as base classes.

```ts
import path from 'node:path'
import Renamer, { FindReplace, IndexReplace } from 'renamer'
import type { Plugin } from 'renamer'

/* Lower-case the file name, then apply the default chain */
class LowerCase implements Plugin {
  replace (filePath: string): string {
    const file = path.parse(filePath)
    return path.join(file.dir, file.base.toLowerCase())
  }
}

await new Renamer().rename({
  files: ['*.JPG'],
  chain: [LowerCase, FindReplace, IndexReplace],
  find: 'pic',
  replace: 'photo-{{index}}',
  dryRun: true
})
```

### `FindReplace`

Find and replace in the file name, using the `find`, `replace` and `pathElement` options. Throws if neither `find` nor `replace` is set.

| Method | Description |
| --- | --- |
| `replace(filePath, options)` | Replaces the first match of `options.find` (or every match, for a RegExp with the `g` flag) in the `options.pathElement` of `filePath`. If `find` is not set, the whole path element is replaced. |
| `description()` | The description shown by `--help`. |
| `optionDefinitions()` | The `--find`, `--replace` and `--path-element` options. |

### `IndexReplace`

Replaces every `{{index}}` token in the file name with a number, using the `indexFormat` and `indexRoot` options. The number starts at `indexRoot` and increments for each file name containing the token, so an instance counts across all the files it processes. Renamer creates a new instance for each run when given the name or class.

| Method | Description |
| --- | --- |
| `replace(filePath, options)` | Replaces the tokens in the file name of `filePath`, if any. A token in a directory name is left unchanged. |
| `description()` | The description shown by `--help`. |
| `optionDefinitions()` | The `--index-format` and `--index-root` options. |

## Views

Views are used by the command-line interface only: they receive its output events and display them. The built-in views are `default`, `long`, `diff` and `one-line`. Select a custom view with `--view`, giving the path to a module or the name of a locally installed package whose default export is a view class.

### `View`

```ts
interface View {
  write (...args: ViewWriteArgs): void
}
```

Called once per event with the event name, its value (see [`ViewEventMap`](#vieweventmap)) and the command-line options.

```ts
import type { View, ViewWriteArgs } from 'renamer'

class SummaryView implements View {
  write (...[key, value]: ViewWriteArgs): void {
    if (key === 'result' && value.renamed) {
      console.log(`${value.from} → ${value.to}`)
    } else if (key === 'complete') {
      console.log(`${value.renamed} of ${value.total} renamed`)
    } else if (key === 'error') {
      console.error(value.message)
    }
  }
}

export default SummaryView
```

With `--silent`, `write()` is not called. A view does not need to handle every event. See [example/view](../example/view).

### `ViewWriteArgs`

```ts
type ViewWriteArgs =
  | [key: 'info', value: string, options?: CliOptions]
  | [key: 'start', value: null, options?: CliOptions]
  | [key: 'result', value: ReplaceResult, options?: CliOptions]
  | [key: 'complete', value: RenameStats, options?: CliOptions]
  | [key: 'error', value: Error, options?: CliOptions]
  | [key: 'usage', value: string, options?: CliOptions]
```

The arguments of `View.write()`, one tuple per event (derived from [`ViewEventMap`](#vieweventmap)). Because it is a union of tuples, checking `key` narrows the type of `value`, as in the example above. `options` is `undefined` if the command line could not be parsed, for example when an unknown option is given.

### `ViewEventMap`

The events a view receives, in order, and the type of each value.

| Event | Value type | Sent |
| --- | --- | --- |
| `usage` | `string` | With `--help`: the formatted usage guide. No other events follow. |
| `info` | `string` | With `--dry-run`: the text `Dry run`. |
| `start` | `null` | Before the first file is processed. |
| `result` | [`ReplaceResult`](#replaceresult) | After each file is processed. |
| `complete` | [`RenameStats`](#renamestats) | After the last file is processed. |
| `error` | `Error` | If an error stops the run, e.g. one of the [errors](#errors) above or an invalid command line. The process exit code is set to 1. |

### `ViewEvent`

```ts
type ViewEvent = 'info' | 'start' | 'result' | 'complete' | 'error' | 'usage'
```

The name of a view event, `keyof ViewEventMap`.

### `ViewClass`

```ts
type ViewClass = new () => View
```

A view class. The command-line interface instantiates it with no arguments.

### `CliOptions`

The options parsed from the command line, passed to views as `options`. The [`RenamerOptions`](#renameroptions) (with `files` always an array) plus:

| Property | Type | Description |
| --- | --- | --- |
| `view` | `string` | The `--view` value. |
| `silent` | `boolean` | `--silent`: suppress all output. |
| `verbose` | `boolean` | `--verbose`: also output the files that were not renamed. |
| `help` | `boolean` | `--help`: print the usage guide instead of renaming. |
| `plugin` | [`Plugin[]`](#plugin) | The loaded replace chain. |
| any other | `unknown` | Options defined by the plugins in the chain. |

On the command line, `--find` is parsed as a regular expression if it is a literal such as `/one/i`, so in views `find` is a `string`, a `RegExp` or `null` (not set).

## Built-in views

Select a built-in view on the command line with `--view long`, `--view diff` or `--view one-line`. The view classes are exported so a custom view can extend one, for example to send the default output somewhere other than the console:

```ts
import fs from 'node:fs'
import { DefaultView } from 'renamer'

class LogFileView extends DefaultView {
  override log (line = ''): void {
    fs.appendFileSync('renamer.log', line + '\n')
  }
}

export default LogFileView
```

### `DefaultView`

One line per renamed file (with `--verbose`, per processed file), then a summary. Each event is handled by a method which a subclass may override:

| Method | Description |
| --- | --- |
| `write(key, value, options)` | Passes each event to the method which handles it. `start` events are ignored and `usage` events are passed to `log()`. |
| `log(line)` | Writes a line to the console. Override to redirect all output. |
| `logInfo(text)` | `info` events: the text, underlined, between blank lines. |
| `logResult(result, options)` | `result` events: logs `createResultLine(result)` if the file was renamed or `options.verbose` is set. |
| `createResultLine(result)` | The line logged for a result: the symbol, the old path and, if renamed, the new path. |
| `resultSymbol(result)` | The symbol at the start of a result line: a green tick if renamed, otherwise a red cross. If the locale is not UTF-8, ASCII is used instead (`+` and `-`, with `->` between the paths), see [Troubleshooting](../README.md#troubleshooting). |
| `logError(err)` | `error` events: the error message and a pointer to `renamer --help`. |
| `logComplete(stats, options)` | `complete` events: the summary line. |

### `LongView`

Extends [`DefaultView`](#defaultview), overriding `logResult()` to print the before and after paths on separate lines.

### `DiffView`

Extends [`DefaultView`](#defaultview), overriding `logResult()` to print the before and after paths plus a coloured character diff.

### `OneLineView`

Extends [`DefaultView`](#defaultview), printing only the summary line (plus usage and errors). Overrides `write()` and `logComplete()`, which also reports a dry run.

## Low-level

These types describe the internal rename of a single file. They are exported for completeness; the `Renamer` methods cover normal use.

### `RenameFileOptions`

| Property | Type | Description |
| --- | --- | --- |
| `force` | `boolean` | Rename even if the target path exists. |
| `dryRun` | `boolean` | Simulate the rename without touching the file system. |
| `dryRunLog` | `Map<string, string>` | Targets claimed by earlier dry-run renames in the same run, mapped to their source paths. Shared between the renames of a run to detect two files being renamed to the same target. |

### `TargetExistsError`

```ts
type TargetExistsError = Error & { code: 'exists' }
```

Thrown when a rename target already exists (or, in a dry run, was already claimed by another file in the same run) and `force` is not set. Check `code` to handle it:

```js
try {
  await renamer.rename(options)
} catch (err) {
  if (err.code === 'exists') {
    console.error('Target exists, use force to overwrite:', err.message)
  } else {
    throw err
  }
}
```
