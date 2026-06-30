import type { Condition, Mutation } from './function-types'

export type Property = {
  type: string
  internalId: string
  label: string
  defaultValue: string
  parent: string
  children?: Property[]
  parentArray?: string
}

export type Source = {
  id: string
  label: string
  type: string
}

export type Mapping = {
  id: string
  sources: Property[]
  target: Property
  mutations: Mutation[]
  conditions: Condition[]
  conditional: Condition | null
  output: string
}

export type Target = {
  mapping?: Mapping
  isAttribute?: boolean
} & Property

export type MappingFile = {
  sourceType: string
  targetType: string
  targetStructure: Target[]
  sourceStructure: Property[]
}

export type MappingRow = {
  id: string
  sourcesNames: string[]
  targetsNames: string[]
  type: string
  mutations: Mutation[]
  conditions: Condition[]
  conditional: Condition | null
  outputLabel: string
}
