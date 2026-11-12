import chalk from 'chalk'
import DefaultView from './default.ts'
import fastDiff from 'fast-diff'
import type { CliOptions, ReplaceResult } from '../types.ts'

/** Like the long view, plus a coloured character diff of each rename. */
class DiffView extends DefaultView {
  override logResult (result: ReplaceResult, options: CliOptions = {}): void {
    const symbol = this.resultSymbol(result)

    const data: string[] = []
    if (result.renamed) {
      const diff = fastDiff(result.from, result.to)
      for (const [code, hunk] of diff) {
        if (code === fastDiff.EQUAL) {
          data.push(hunk)
        } else if (code === fastDiff.DELETE) {
          data.push(chalk.bgRed(hunk))
        } else if (code === fastDiff.INSERT) {
          data.push(chalk.bgGreen.black(hunk))
        }
      }
    }

    if (options.verbose) {
      this.log(`${'Renamed:'.padEnd(8)} ${symbol}`)
      this.log(`${'Before:'.padEnd(8)} ${result.from}`)
      if (result.renamed) {
        this.log(`${'After:'.padEnd(8)} ${result.to}`)
      }
      if (data.length) {
        this.log(`${'Diff:'.padEnd(8)} ${data.join('')}`)
      }
      this.log('--------')
    } else {
      if (result.renamed) {
        this.log(`${'Before:'.padEnd(8)} ${result.from}`)
        this.log(`${'After:'.padEnd(8)} ${result.to}`)
        this.log(`${'Diff:'.padEnd(8)} ${data.join('')}`)
        this.log('--------')
      }
    }
  }
}

export default DiffView
