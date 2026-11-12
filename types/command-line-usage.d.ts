// Local declarations for command-line-usage@7 (the @types package targets v5).
declare module 'command-line-usage' {
  export interface OptionDefinition {
    name: string
    type?: (input: string) => unknown
    alias?: string
    multiple?: boolean
    lazyMultiple?: boolean
    defaultOption?: boolean
    defaultValue?: unknown
    group?: string | string[]
    description?: string
    typeLabel?: string
  }
  /** A section of text; `content` may be a string, lines of text or table rows. */
  export interface ContentSection {
    header?: string
    content?: string | string[] | Record<string, unknown>[] | { data: Record<string, unknown>[], options?: Record<string, unknown> }
    raw?: boolean
  }
  /** A section listing option definitions. */
  export interface OptionListSection {
    header?: string
    optionList: readonly OptionDefinition[]
    group?: string | string[]
    hide?: string | string[]
    reverseNameOrder?: boolean
    tableOptions?: Record<string, unknown>
  }
  export type Section = ContentSection | OptionListSection
  /** Render a usage guide. */
  export default function commandLineUsage (sections: Section | readonly Section[]): string
}
