import type { OptionDefinition, Plugin, ReplaceOptions } from '../../index.ts'

class DummyPlugin implements Plugin {
  description (): string {
    return 'Dummy plugin.'
  }

  optionDefinitions (): OptionDefinition[] {
    return [
      {
        name: 'something',
        type: Boolean,
        description: 'Something.'
      }
    ]
  }

  replace (filePath: string, options: ReplaceOptions, index: number, files: string[]): string {
    return `file: ${filePath}, index: ${index}, file count: ${files.length}`
  }
}

export default DummyPlugin
