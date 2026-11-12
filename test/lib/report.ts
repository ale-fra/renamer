import chalk from 'chalk'

/*
 * The report printed at the end of a test run, by `npm test` and `npm run test:e2e`.
 * The text is ASCII only, so it displays correctly in any terminal.
 */

/** A line of the report: a label and a value, optionally indented under the previous line. */
export interface ReportLine {
  label: string
  value: string | number
  indent?: boolean
}

const width = 78

/** Format a duration in milliseconds, e.g. `850 ms` or `4.21 s`. */
export function formatDuration (ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`
}

/** Format the report: a title, the lines, then the overall result. */
export function formatReport (title: string, lines: ReportLine[], passed: boolean): string {
  const labelWidth = Math.max(...lines.map(line => line.label.length + (line.indent ? 2 : 0)), 'RESULT'.length) + 3
  const row = (label: string, value: string, indent = false): string =>
    `  ${(indent ? '  ' : '') + label}`.padEnd(labelWidth + 2) + value
  const result = passed ? chalk.green.bold('PASSED') : chalk.red.bold('FAILED')
  return [
    '',
    '='.repeat(width),
    ` ${title}`,
    '='.repeat(width),
    ...lines.map(line => row(line.label, String(line.value), line.indent)),
    '-'.repeat(width),
    row('RESULT', result),
    '='.repeat(width),
    ''
  ].join('\n')
}
