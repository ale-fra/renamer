import chalk from 'chalk'
import { outputSymbols } from '../symbols.ts'
import type { CliOptions, RenameStats, ReplaceResult, View, ViewWriteArgs } from '../types.ts'

/** The default view: one line per rename, plus a summary. */
class DefaultView implements View {
  log (string?: string): void {
    console.log(string || '')
  }

  logInfo (string: string): void {
    this.log()
    this.log(chalk.bold.underline(string))
    this.log()
  }

  /** A green tick if the file was renamed, otherwise a red cross. ASCII if the terminal may not display Unicode. */
  resultSymbol (result: ReplaceResult): string {
    const { tick, cross } = outputSymbols()
    return result.renamed ? chalk.green(tick) : chalk.red(cross)
  }

  createResultLine (result: ReplaceResult & { error?: string }): string {
    const symbol = this.resultSymbol(result)
    const desc = result.from + (result.renamed ? chalk.bold(` ${outputSymbols().arrow} `) + result.to : '')
    const errDesc = result.error ? `(${chalk.red(result.error)})` : ''
    return `${symbol} ${desc} ${errDesc}`
  }

  logResult (result: ReplaceResult, options: CliOptions = {}): void {
    if (result.renamed || options.verbose) {
      this.log(this.createResultLine(result))
    }
  }

  logError (err: Error): void {
    this.log(chalk.red('ERROR: ' + err.message))
    this.log(chalk.red('\nRun `renamer --help` for usage instructions.\n'))
  }

  /* `options` is unused here but available to subclasses, see OneLineView. */
  logComplete (stats: RenameStats, options?: CliOptions): void {
    this.log(`\nRename complete: ${stats.renamed} of ${stats.total} files renamed.\n`)
  }

  write (...[key, value, options]: ViewWriteArgs): void {
    switch (key) {
      case 'info': this.logInfo(value); break
      case 'usage': this.log(value); break
      case 'result': this.logResult(value, options); break
      case 'error': this.logError(value); break
      case 'complete': this.logComplete(value, options); break
      /* 'start' is not displayed */
    }
  }
}

export default DefaultView
