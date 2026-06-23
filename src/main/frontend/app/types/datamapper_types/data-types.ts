export type RuleSet = {
  minValue?: number
  maxValue?: number
  decimalAllowed?: boolean
}

export type PropertyDefinition = {
  name: string
  type: PropertyBasicTypes
  rules: RuleSet
}

export type FormatDefinition = {
  name: string
  schemaFileExtension: string
  duplicateKeysAllowed: boolean
  properties: PropertyDefinition[]
}

export type DataTypeSchema = FormatDefinition[]

export type FormatState = {
  source: FormatDefinition | null
  target: FormatDefinition | null
}

export type PropertyBasicTypes = 'string' | 'number' | 'boolean' | 'object' | 'array'
