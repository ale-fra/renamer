# TODO

Release checklist carried forward from the sandbox, with integration work recorded below. Publishing to npm and updating the upstream wiki are separate release tasks.

## Before publishing

- [x] **Update the existing CI workflow for v6.** The fork's `.github/workflows/node.js.yml` now tests Node.js `22.18.0`, `22.x` and `24.x` on Linux, macOS and Windows with `npm ci`, the strict type check and tests, the built CLI end-to-end test, and an isolated tarball installation checking the CLI, API and public types. The README CI badge points to this fork.
- [ ] **Confirm the full CI matrix passes**, including Windows-specific path and terminal behaviour. The integration updates the previously Linux-only assertions and avoids case-colliding fixtures on case-insensitive file systems.
- [ ] **Tag and publish.** Create the `v6.0.0` git tag, run `npm publish` (which builds `dist/` via `prepack`), and create the GitHub release using [docs/release-notes-v6.md](docs/release-notes-v6.md).

## After publishing

- [ ] **Check the npm package page** renders the README correctly, including the warning blockquote, the tables, and the relative links (npm rewrites them to the GitHub repository, via the `repository` field).
- [ ] **Update the wiki for v6.** The pages linked from the README describe v5:
  - [Renamer CLI docs](https://github.com/75lb/renamer/wiki/Renamer-CLI-docs): Node.js v22.18 requirement; the whole-literal rule for `--find` regular expressions; `--path-element name` and `ext` without `--find`; the `--option=value` form for values beginning with a hyphen; natural ordering of glob matches. The built-in `--help` text is the up-to-date reference.
  - [How to write a replace chain plugin](https://github.com/75lb/renamer/wiki/How-to-write-a-replace-chain-plugin): plugins in TypeScript, the `Plugin` type, `defaultValue` only applying on the command line, and extending the exported `FindReplace` and `IndexReplace` classes.
  - [How to use replace chain plugins](https://github.com/75lb/renamer/wiki/How-to-use-replace-chain-plugins) and [examples](https://github.com/75lb/renamer/wiki/examples): check for v5-only behaviour.
- [ ] **Check the views demo gif** (`https://i.imgur.com/7830Y9N.gif`) still loads. The view output format did not change in v6, so it should still be accurate.

## External links to verify

None of these could be loaded from the development environment. Relative links are checked by the test suite.

- [ ] Badges: `https://badgen.net/npm/v/renamer`, `https://badgen.net/npm/dt/renamer`, `https://badgen.net/github/dependents-repo/75lb/renamer`, `https://badgen.net/github/dependents-pkg/75lb/renamer`, and the GitHub Actions badge (see CI above).
- [ ] GitHub: `https://github.com/75lb/renamer/releases`, `/discussions`, `/wiki` and the wiki pages above, `/network/dependents`.
- [ ] `https://github.com/75lb/command-line-args/blob/master/doc/option-definition.md` (linked from `example/chain/suffix.js` and `.ts`), `https://github.com/75lb/command-line-args` and `https://github.com/75lb/command-line-usage`.
- [ ] `https://nodejs.org/api/typescript.html#type-stripping`, in particular that the `#type-stripping` anchor exists.
- [ ] `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions` and `https://nodejs.org/en/`.
