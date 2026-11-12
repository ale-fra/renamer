# Examples

Every example is available in JavaScript and TypeScript. The two versions behave identically, which the test suite checks.

| Example | JavaScript | TypeScript | Demonstrates |
| --- | --- | --- | --- |
| simple-find-replace | [api/simple-find-replace.js](api/simple-find-replace.js) | [api/simple-find-replace.ts](api/simple-find-replace.ts) | `renamer.rename()`: rename files and get all the results at the end. |
| result-iterator | [api/result-iterator.js](api/result-iterator.js) | [api/result-iterator.ts](api/result-iterator.ts) | `renamer.results()`: process the renames one at a time, as each completes. |
| index-replace | [api/index-replace.js](api/index-replace.js) | [api/index-replace.ts](api/index-replace.ts) | The `{{index}}` token: number every file and folder in the sandbox. |
| prefix | [chain/prefix.js](chain/prefix.js) | [chain/prefix.ts](chain/prefix.ts) | A minimal replace chain plugin, which adds a `[DONE] ` prefix. |
| suffix | [chain/suffix.js](chain/suffix.js) | [chain/suffix.ts](chain/suffix.ts) | A plugin with a description and its own `--suffix` option, both listed by `--help`. |
| minimal-view | [view/minimal-view.js](view/minimal-view.js) | [view/minimal-view.ts](view/minimal-view.ts) | A minimal custom view, which prints every event it receives. |
| custom-view | [view/custom-view.js](view/custom-view.js) | [view/custom-view.ts](view/custom-view.ts) | A custom view with formatted, coloured output. |

## Running the examples

All commands are run from the project root, and every example is a dry run: no files are renamed.

**1. Build.** The API examples import the package by name (`renamer`), which resolves to the compiled `dist/` folder.

```
$ npm ci
$ npm run build
```

**2. Create the sandbox** of test files, `example/sandbox`. Run this again at any time to reset it.

```
$ cd example && node make-sandbox.js && cd ..
```

**3. Run an example.** To run the TypeScript version, change `.js` to `.ts`: Node.js v22.18 or above runs TypeScript directly.

| Example | Command |
| --- | --- |
| simple-find-replace | `node example/api/simple-find-replace.js` |
| result-iterator | `node example/api/result-iterator.js` |
| index-replace | `node example/api/index-replace.js` |
| prefix | `node bin/cli.ts --dry-run --chain example/chain/prefix.js "example/sandbox/pics/*"` |
| suffix | `node bin/cli.ts --dry-run --chain example/chain/suffix.js --suffix=-done "example/sandbox/pics/*"` |
| suffix (usage guide) | `node bin/cli.ts --chain example/chain/suffix.js --help` |
| minimal-view | `node bin/cli.ts --dry-run --find pic --replace photo --view example/view/minimal-view.js "example/sandbox/pics/*"` |
| custom-view | `node bin/cli.ts --dry-run --find pic --replace photo --view example/view/custom-view.js "example/sandbox/pics/*"` |

`node bin/cli.ts` runs the command line from source. With renamer installed, use `renamer` instead, e.g. `renamer --dry-run --chain example/chain/prefix.js "example/sandbox/pics/*"`.

The value `-done` begins with a hyphen, so it is given as `--suffix=-done` rather than `--suffix -done`, which would be read as options.

## Example output

`result-iterator` prints each result as its rename completes (in a dry run, as it would complete):

```
$ node example/api/result-iterator.js
{
  from: './example/sandbox/pics/pic1.jpg',
  to: 'example/sandbox/pics/photo1.jpg',
  renamed: true
}
{
  from: './example/sandbox/pics/pic2.jpg',
  to: 'example/sandbox/pics/photo2.jpg',
  renamed: true
}
{
  from: './example/sandbox/pics/pics/',
  to: 'example/sandbox/pics/photos',
  renamed: true
}
```

The sandbox's `pics` folder contains a subfolder, also called `pics`, which is renamed too.
