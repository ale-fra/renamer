# renamer v6.0.0 release notes

Renamer is now written in TypeScript and ships type definitions. The command line and API are backwards compatible except for the breaking changes listed below, most of which are bug fixes that change behaviour.

## Breaking changes

* **Node.js v22.18 or above is required.** Node.js 18 and 20 have reached end-of-life.
* **`--find` is only treated as a regular expression if the whole value is a literal**, i.e. a slash, the pattern, a slash and optional flags. Previously the first slash-delimited section anywhere in the value was used, so `--find x/on/` silently meant `/on/` and `--find a/b/c` failed with "Invalid flags". Such values are now plain strings.
* **API: `replace` defaults to an empty string**, as documented. Previously, calling `rename({ find: 'o' })` without `replace` inserted the text `undefined`, renaming `one` to `undefinedne`. The command line was not affected.
* **`--path-element name` and `--path-element ext` without `--find` now replace the whole name or extension.** Previously nothing was renamed. For example `renamer --path-element ext --replace .jpg "*.jpeg"` now renames `a.jpeg` to `a.jpg`.
* **The `{{index}}` token only counts in file names.** A token in a directory name (which is never replaced) no longer consumes a number.
* **Glob matches are processed in natural order** (`file2` before `file10`), so `{{index}}` numbering is predictable. Previously the order depended on the file system and could differ between runs. Explicit paths are still processed in the order given.
* **A dry-run collision error now has `code: 'exists'`** and the same message format as other "file exists" errors: `Unable to rename <from> to <to> [file exists]` (previously the paths were quoted and there was no `code`).
* **The package contents moved to `dist/`.** Only the `renamer` entry point is exported, as before, so imports of `renamer` are unaffected.

## New

* **TypeScript definitions** for the API, plugins and views: `RenamerOptions`, `ReplaceResult`, `Plugin`, `View` and more, see the [API documentation](API.md). `ReplaceResult` is a union, so checking `renamed` narrows `to` from `string | null` to `string`.
* **Plugins and views can be written in TypeScript** and loaded directly with `--chain plugin.ts` or `--view view.ts`, as Node.js strips the types. See the [README](../README.md#typescript).
* **The built-in plugins and views are exported**: `FindReplace`, `IndexReplace`, `DefaultView`, `LongView`, `DiffView` and `OneLineView`, for use in a replace chain or as base classes. See the [API documentation](API.md#built-in-plugins).

## Fixes

* **Garbled symbols in terminals without a UTF-8 locale.** The output symbols (`✔︎`, `✖`, `→` and `↓`) were always Unicode, so a terminal which was not decoding UTF-8 displayed each byte as a replacement character, e.g. `✔︎` as `������`. Renamer now uses ASCII (`+`, `-`, `->`) unless the locale is UTF-8, going by the first of `LC_ALL`, `LC_CTYPE` and `LANG` which is set (the rule npm uses). Force ASCII with `LC_ALL=C`.
* Dry-run collision checks also reject relative and absolute paths to the same target.
* **Dry runs no longer share state.** A second dry run of the same files in one process, via the API or `CliApp`, failed with a false "file exists".
* A dry-run target named like an `Object.prototype` property, e.g. `constructor`, was falsely reported as existing.
* `--help` crashed with a plugin which does not define `optionDefinitions()`. The error also escaped error handling, so the exit code was still 0. Errors while printing the usage guide are now reported and set the exit code to 1.
* Clearer errors for invalid plugins and views:
  * A plugin whose `replace()` returns something other than a string gets `Invalid plugin: <Name>.replace() must return a string`, instead of a `TypeError` from `path.resolve`.
  * A plugin module without a default class export gets `Invalid plugin: plugin module must export a class`.
  * A view module without a default class export gets `View module must export a class`.
  * A `null` item in `chain` gets `Invalid plugin: …`.
* An empty replace chain leaves files unchanged, rather than producing an empty target path.
* The command line loaded the replace chain twice per run, instantiating each plugin twice. Each plugin is now instantiated once per run.
* Corrected `--help` text for `--chain`, `--view`, `--find` and the `{{index}}` token.
* The default view test no longer depends on the terminal supporting colour.

## Documentation and examples

* New [API documentation](API.md) covering every exported type, the order of operations and errors.
* README: corrected the plugin example output, added sections on path elements, numbering files, the API and TypeScript, and documented the `--option=value` form for values beginning with a hyphen.
* Every example is now also available in TypeScript. `example/chain/prefix.js` now adds a prefix (it previously added a suffix), `example/chain/suffix.js` no longer appends `undefined` when used via the API without `suffix`, and [example/README.md](../example/README.md) explains how to run the examples.

## For contributors

* Sources are TypeScript, run directly by Node.js during development: `npm ci`, then `npm test` (type-check plus tests) and `npm run build` (compile to `dist/`).
* Development dependencies are pinned and in the lockfile. The tests are run by `scripts/test.ts`, a minimal runner with no dependencies, which also works in the Windows command prompt. Each run ends with a report of the tests run, passed, failed and skipped; unhandled promise rejections fail the run, including rejections from pending timers after the last test.
* The test suite checks the documentation against the code: exports, signatures, member tables, code examples, links and command-line options.
* `npm run test:e2e` runs the built command end to end in a temporary directory, ends with a report, and keeps the directory for inspection.

* CI tests the minimum Node.js version and current 22.x/24.x on Linux, macOS and Windows, including an isolated package installation with strict consumer type checking.
* Updated the transitive `picomatch` dependency to address known vulnerabilities.
