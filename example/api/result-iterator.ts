import Renamer from 'renamer'
import type { RenamerOptions } from 'renamer'

const renamer = new Renamer()
const options: RenamerOptions = {
  files: ['./example/sandbox/pics/*'],
  find: 'pic',
  replace: 'photo',
  dryRun: true
}
for await (const result of renamer.results(options)) {
  /* `result` is a ReplaceResult: once `result.renamed` is checked, `result.to` is a string */
  console.log(result)
}
