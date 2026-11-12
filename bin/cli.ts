#!/usr/bin/env node
import CliApp from '../lib/cli-app.ts'

const cliApp = new CliApp()

/* Exported so the test suite can await completion */
export default cliApp.start()
