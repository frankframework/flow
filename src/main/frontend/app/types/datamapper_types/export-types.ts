import type { Condition, Mutation } from './function-types'

export interface Property {
  type: string
  internalId: string
  label: string
  defaultValue: string
  parent: string
  children?: Property[]
  parentArray?: string
}

export interface Source {
  id: string
  label: string
  type: string
}

export interface Mapping {
  id: string
  sources: Property[]
  target: Property
  mutations: Mutation[]
  conditions: Condition[]
  conditional: Condition | null
  output: string
}

export interface Target extends Property {
  mapping?: Mapping
}

export interface MappingFile {
  sourceType: string
  targetType: string
  targetStructure: Target[]
  sourceStructure: Property[]
}

export interface MappingRow {
  id: string
  sourcesNames: string[]
  targetsNames: string[]
  type: string
  mutations: Mutation[]
  conditions: Condition[]
  conditional: Condition | null
  outputLabel: string
}
