import Renamer from 'renamer'
import type { ReplaceResult } from 'renamer'

const renamer = new Renamer()
const results: ReplaceResult[] = await renamer.rename({
  files: ['./example/sandbox/pics/*'],
  find: 'pic',
  replace: 'photo',
  dryRun: true
})
console.log('results', results)
