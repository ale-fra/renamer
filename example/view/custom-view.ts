import chalk from 'chalk'
import type { RenameStats, ReplaceResult, View, ViewWriteArgs } from 'renamer'

class CustomView implements View {
  start (): void {
    console.log('\n🔥 START 🔥\n')
  }

  logResult (result: ReplaceResult): void {
    if (result.renamed) {
      console.log(`${chalk.red(result.from.padEnd(25))} ${chalk.green(result.to)}`)
    }
  }

  logError (err: Error): void {
    console.error('ERROR', err.message)
  }

  complete (stats: RenameStats): void {
    console.log(`\n🏆 COMPLETE (${stats.renamed} of ${stats.total}) 🏆\n`)
  }

  /* Checking `key` narrows the type of `value` */
  write (...[key, value]: ViewWriteArgs): void {
    switch (key) {
      case 'start': this.start(); break
      case 'result': this.logResult(value); break
      case 'error': this.logError(value); break
      case 'complete': this.complete(value); break
    }
  }
}

export default CustomView
