import DefaultView from '../../lib/view/default.ts'

/** A default view which records its output instead of printing it. */
class TestView extends DefaultView {
  /** The arguments of each `log()` call. */
  logs: string[][] = []
  /** Errors written to the view. */
  errors: Error[] = []

  override log (...args: string[]): void {
    this.logs.push(args)
  }

  override logError (err: Error): void {
    this.errors.push(err)
    super.logError(err)
  }
}

export default TestView
