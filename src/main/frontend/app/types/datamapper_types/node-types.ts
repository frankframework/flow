import type { Node } from '@xyflow/react'
import type { Condition, Mutation } from './config-types'

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
}

export type MappingConfig = {
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

export type PropertyNode = Node<CustomNodeData> & {
  type: 'targetOnly' | 'sourceOnly' | 'labeledGroup' | 'extraSourceNode'
}

export type MappingNode = Node<MappingConfig> & {
  type: 'mappingNode'
}

export type FlowNode = PropertyNode | MappingNode
