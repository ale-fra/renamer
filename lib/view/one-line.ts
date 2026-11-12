import chalk from 'chalk'
import DefaultView from './default.ts'
import type { CliOptions, RenameStats, ViewWriteArgs } from '../types.ts'

/** Only the summary line (plus usage and errors). */
class OneLineView extends DefaultView {
  override logComplete (stats: RenameStats, options: CliOptions = {}): void {
    const dryRun = options.dryRun ? chalk.bold.underline('Dry run.') + ' ' : ''
    this.log(`${dryRun}Rename complete: ${stats.renamed} of ${stats.total} files renamed.`)
  }

  override write (...[key, value, options]: ViewWriteArgs): void {
    switch (key) {
      case 'usage': this.log(value); break
      case 'error': this.logError(value); break
      case 'complete': this.logComplete(value, options); break
      /* other events are not displayed */
    }
  }
}

export default OneLineView
