export interface RuleSet {
  minValue?: number
  maxValue?: number
  decimalAllowed?: boolean
}

export interface PropertyDefinition {
  name: string
  type: PropertyBasicTypes
  rules: RuleSet
}

export interface FormatDefinition {
  name: string
  schemaFileExtension: string
  duplicateKeysAllowed: boolean
  properties: PropertyDefinition[]
}

export type DataTypeSchema = FormatDefinition[]

export interface FormatState {
  source: FormatDefinition | null
  target: FormatDefinition | null
}

export type PropertyBasicTypes = 'string' | 'number' | 'boolean' | 'object' | 'array'
