export type ConditionInput = {
  type: 'source' | 'defaultValue' | 'attribute' | 'operator' | ''
  value: string
  sourceId?: string
}

export type Condition = {
  id: string
  name: string
  type: ConditionType | null
  inputs: ConditionInput[]
}

export type MutationInput = {
  type: 'source' | 'defaultValue' | 'attribute'
  sourceId?: string
  value: string
}

export type Mutation = {
  name: string
  id: string
  mutationType: MutationType | null
  inputs: MutationInput[]
}
export type MutationTypeInput = {
  label: string
  type: 'source' | 'attribute'
  allowDefaultValue: boolean
  expandable: boolean
  inputsAllowed: string
}

export type MutationType = {
  name: string
  maxInputs: number | null
  requiredInputs: number
  inputs: MutationTypeInput[]
  outputType: string
}

export type MutationsConfig = {
  mutations: MutationType[]
}

export type ConditionOperatorConfig = {
  label: string
  allowedValues: string[]
  resultType: string
}

export type ConditionTypeInput = {
  label: string
  type: string
  allowDefaultValue: boolean
  inputsAllowed: string
}

export type ConditionType = {
  name: string
  maxInputs: number | null
  requiredInputs: number
  inputs: ConditionTypeInput[]
}
export type ConditionTypeConfig = {
  operators: Record<string, ConditionOperatorConfig>
  conditions: ConditionType[]
}
