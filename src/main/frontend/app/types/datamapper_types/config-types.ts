import type { ReactFlowJsonObject } from '@xyflow/react'
import type { FormatState } from './data-types'

export interface MappingListConfig {
  stage: string
  formatTypes: FormatState
  propertyData: ReactFlowJsonObject
}

export interface MappingEndpoint {
  format: string
  path: string
}
export interface Property {
  type: string
  internalId: string
  label: string
  defaultValue: string
  parent: string
  children?: Property[]
}

export interface Source {
  id: string
  label: string
  type: string
}

export interface ConditionInput {
  type: 'source' | 'defaultValue' | 'attribute' | 'operator' | ''
  value: string
  sourceId?: string
}

export interface Condition {
  id: string
  name: string
  type: ConditionType | null
  inputs: ConditionInput[]
}

export interface Mutation {
  name: string
  id: string
  mutationType: MutationType | null
  inputs: MutationInput[]
}

export interface MutationInput {
  type: 'source' | 'defaultValue' | 'attribute'
  sourceId?: string
  value: string
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

export interface MutationTypeInput {
  label: string
  type: 'source' | 'attribute'
  allowDefaultValue: boolean
  expandable: boolean
  inputsAllowed: string
}

export interface MutationType {
  name: string
  maxInputs: number | null
  requiredInputs: number
  inputs: MutationTypeInput[]
  outputType: string
}

export interface MutationsConfig {
  mutations: MutationType[]
}

export interface ConditionOperatorConfig {
  label: string
  allowedValues: string[]
  resultType: string
}

export interface ConditionTypeInput {
  label: string
  type: string
  allowDefaultValue: boolean
  inputsAllowed: string
}

export interface ConditionType {
  name: string
  maxInputs: number | null
  requiredInputs: number
  inputs: ConditionTypeInput[]
}
export interface ConditionTypeConfig {
  operators: Record<string, ConditionOperatorConfig>
  conditions: ConditionType[]
}
