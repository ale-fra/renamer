import { optionDefinitions, usageSections } from './cli-options.ts'
import { streamReadText } from 'stream-read-all'
import Renamer from '../index.ts'
import { regExpBuilder, loadPlugins } from './util.ts'
import commandLineUsage from 'command-line-usage'
import commandLineArgs from 'command-line-args'
import FindReplace from './chain/find-replace.ts'
import IndexReplace from './chain/index-replace.ts'
import DefaultView from './view/default.ts'
import LongView from './view/long.ts'
import DiffView from './view/diff.ts'
import OneLineView from './view/one-line.ts'
import { loadModule } from 'load-module'
import type { CliOptions, OptionDefinition, Plugin, RenameStats, ReplaceResult, View } from './types.ts'

export interface CliAppOptions {
  /** The view to write output to. Defaults to the default view. */
  view?: View
}

export interface StartOptions {
  /** The command-line arguments. Defaults to `process.argv`. */
  argv?: string[]
}

/** True if `input` has a `write` method. */
function isView (input: unknown): input is View {
  return typeof input === 'object' && input !== null &&
    typeof (input as { write?: unknown }).write === 'function'
}

/** Anything can be thrown; views expect an Error. */
function toError (err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

class CliApp {
  view: View
  /** The options of the most recent run. Undefined until the command line has been parsed. */
  options?: CliOptions

  constructor (options: CliAppOptions = {}) {
    this.view = options.view || new DefaultView()
  }

  /** Process the renames. Errors are written to the view and set `process.exitCode` to 1. */
  async start (startOptions: StartOptions = {}): Promise<void> {
    try {
      const { cliArgs } = await this.getPluginArgs(optionDefinitions, startOptions.argv)

      this.view = await this.resolveView(cliArgs.view)
      this.options = cliArgs

      if (cliArgs.silent) {
        const noOp = (): void => {}
        this.view = new Proxy(this.view, {
          get: (view, prop) => {
            /* silence log invocations */
            return prop === 'write' ? noOp : Reflect.get(view, prop)
          }
        })
      }

      if (cliArgs.help) {
        await this.printUsage(cliArgs.plugin)
      } else {
        if (!cliArgs.files?.length) {
          /* read file list from stdin */
          const stdin = await streamReadText(process.stdin)
          cliArgs.files = stdin
            .split(/\n|\r\n/)
            .filter(f => f)
            .filter(f => !(f === '.' || f === '..'))
        }
        const renamer = new Renamer()

        /* parse regular expression */
        cliArgs.find = regExpBuilder(cliArgs.find)

        if (cliArgs.dryRun) {
          this.view.write('info', 'Dry run', this.options)
        }

        /* rename files */
        this.view.write('start', null, this.options)
        const results: ReplaceResult[] = []
        /* Reuse the plugins loaded by getPluginArgs() rather than loading the chain again */
        const renameOptions = { ...cliArgs, chain: cliArgs.plugin }
        for await (const replaceResult of renamer.results(renameOptions)) {
          this.view.write('result', replaceResult, this.options)
          results.push(replaceResult)
        }
        const renamed = results.filter(r => r.renamed).length
        const stats: RenameStats = {
          total: results.length,
          renamed,
          notRenamed: results.length - renamed
        }
        this.view.write('complete', stats, this.options)
      }
    } catch (err) {
      this.halt(err)
    }
  }

  /**
   * Return the view to use: a built-in view by name, a custom view module loaded
   * from a path or package name, or the current view if none was specified.
   */
  async resolveView (viewName?: string): Promise<View> {
    if (viewName === 'long') {
      return new LongView()
    } else if (viewName === 'diff') {
      return new DiffView()
    } else if (viewName === 'one-line') {
      return new OneLineView()
    } else {
      let view: unknown = this.view
      if (viewName) {
        const ViewClass = await loadModule(viewName, { paths: process.cwd() })
        /* Any constructor is accepted, including pre-ES2015 constructor functions */
        if (typeof ViewClass !== 'function') {
          throw new Error('View module must export a class')
        }
        view = new (ViewClass as new () => unknown)()
      }
      if (isView(view)) {
        return view
      } else {
        throw new Error('View must define a `write` method')
      }
    }
  }

  async printUsage (plugins: Plugin[] = []): Promise<void> {
    const sections = usageSections(plugins)
    this.view.write('usage', commandLineUsage(sections), this.options)
  }

  halt (err: unknown): void {
    this.view.write('error', toError(err), this.options)
    process.exitCode = 1
  }

  /**
   * Parse the command line, including the options defined by the plugins in the
   * replace chain. Returns the parsed options and the full list of definitions.
   */
  async getPluginArgs (optionDefinitions: OptionDefinition[], argv?: string[]): Promise<{ cliArgs: CliOptions, allOptionDefinitions: OptionDefinition[] }> {
    /* first parse to fetch the --chain values */
    const partialArgs = commandLineArgs(optionDefinitions, { partial: true, argv }) as CliOptions
    const chain = partialArgs.chain
    const loadedPlugins = Array.isArray(chain) && chain.length
      ? await loadPlugins(chain)
      : [new FindReplace(), new IndexReplace()]

    const pluginOptionDefinitions = this.getPluginOptionDefinitions(loadedPlugins)
    const allOptionDefinitions = optionDefinitions.concat(pluginOptionDefinitions)

    /* second parse now we have loaded the plugins and their option definitions.
       The result's shape is defined by allOptionDefinitions. */
    const cliArgs = commandLineArgs(allOptionDefinitions, { argv, camelCase: true }) as CliOptions
    cliArgs.plugin = loadedPlugins
    return {
      cliArgs,
      allOptionDefinitions
    }
  }

  /** Return the option definitions of all plugins which define them. */
  getPluginOptionDefinitions (plugins: Plugin[]): OptionDefinition[] {
    const output: OptionDefinition[] = []
    for (const plugin of plugins) {
      if (plugin.optionDefinitions) {
        output.push(...plugin.optionDefinitions())
      }
    }
    return output
  }
}

export default CliApp
