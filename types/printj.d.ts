// printj ships types for its CommonJS entry only. Its ESM build, `printj/printj.mjs`
// (required for named imports under Node ESM), has the same API.
declare module 'printj/printj.mjs' {
  export { sprintf, vsprintf, version } from 'printj'
}
