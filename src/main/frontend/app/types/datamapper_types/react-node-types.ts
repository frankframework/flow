import type { Node } from '@xyflow/react'
import type { Condition, Mutation } from './function-types'

export type CustomNodeData = {
  id: string
  label: string
  checked?: boolean
  height?: number
  variableType: string
  variableTypeBasic?: string
  defaultValue: string
  parentId: string
  setNodes?: React.Dispatch<React.SetStateAction<Node[]>>
} & Record<string, unknown>

export type GroupNode = Node & {
  type: 'group'
  width: number
  height: number
}

export interface GroupNodeData {
  label?: string
  children?: React.ReactNode
}
export interface NodeLabels {
  id: string
  label: string
  checked?: boolean
  type?: string
  parentArray?: string
}

export type MappingNodeData = {
  id?: string
  label?: string
  outputLabel?: string
  colour?: string
  sources: string[]
  target: string
  mutations: Mutation[]
  conditions?: Condition[]
  type: string
  output: string
  conditional: Condition | null
} & Record<string, unknown>

export type ArrayNodeData = {
  id?: string
  label?: string
  colour?: string
  source: string
  target: string
} & Record<string, unknown>

export type PropertyNode = Node<CustomNodeData> & {
  type: 'targetArrayGroup' | 'sourceArrayGroup' | 'targetOnly' | 'sourceOnly' | 'labeledGroup' | 'extraSourceNode'
}

export type MappingNode = Node<MappingNodeData> & {
  type: 'mappingNode'
}
export type ArrayMappingNode = Node<ArrayNodeData> & {
  type: 'arrayMappingNode'
}

export type FlowNode = PropertyNode | MappingNode | ArrayMappingNode
