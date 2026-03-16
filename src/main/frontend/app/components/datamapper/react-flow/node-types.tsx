import type { Dispatch, RefObject, SetStateAction } from 'react'
import OneEdgeNode, { type OneEdgeNodeProperties } from './one-edge-node'
import LabeledGroupNode, { type LabeledGroupNodeProperties } from './labeled-group-node'
import MappingNode, { type MappingNodeProperties } from './mapping-node'
import type { NodeTypes, Node } from '@xyflow/react'

import ExtraSourceNode, { type ExtraSourceNodeProperties } from './extra-source-node'
import type { useFlowManagement } from '~/hooks/use-datamapper-flow-management'
import type { CustomNodeData, MappingConfig } from '~/types/datamapper_types/node-types'
import ArrayGroupNode, { type ArrayGroupNodeProperties } from './array-group-node'
import type { ArrayMappingNodeProperties } from './array-mapping-node'
import ArrayMappingNode from './array-mapping-node'

interface GetNodeTypesParameters {
  flow: ReturnType<typeof useFlowManagement>
  setReactFlowNodes: Dispatch<SetStateAction<Node[]>>
  setEditingNode: Dispatch<SetStateAction<CustomNodeData | null>>
  setAddFieldModal: Dispatch<SetStateAction<boolean>>
  openModelType: RefObject<'source' | 'target'>
  setEditingMapping: Dispatch<SetStateAction<MappingConfig | null>>
  openMapping: () => void
}

export const getNodeTypes = ({
  flow,
  setReactFlowNodes,
  setEditingNode,
  setAddFieldModal,
  openModelType,
  setEditingMapping,
  openMapping,
}: GetNodeTypesParameters): NodeTypes => ({
  sourceOnly: (properties: OneEdgeNodeProperties) => (
    <OneEdgeNode
      {...properties}
      data={{ ...properties.data, setNodes: setReactFlowNodes }}
      variant="source"
      onEdit={(data) => {
        if (data) {
          setEditingNode(data)
          openModelType.current = 'source'
          setAddFieldModal(true)
        }
      }}
      onDelete={(id) => flow.deleteNode(id)}
      onHighlight={(id) => flow.highlightFromPropertyNode(id)}
    />
  ),
  targetOnly: (properties: OneEdgeNodeProperties) => (
    <OneEdgeNode
      {...properties}
      data={{ ...properties.data, setNodes: setReactFlowNodes }}
      variant="target"
      onEdit={(data) => {
        if (data) {
          setEditingNode(data)
          openModelType.current = 'target'
          setAddFieldModal(true)
        }
      }}
      onDelete={(id) => flow.deleteNode(id)}
      onHighlight={(id) => flow.highlightFromPropertyNode(id)}
    />
  ),
  labeledGroup: (node: LabeledGroupNodeProperties) => (
    <LabeledGroupNode
      {...node}
      onHighlight={(id) => flow.highlightFromPropertyNode(id)}
      onEdit={(data) => {
        if (data) {
          setEditingNode(data)
          openModelType.current = 'target'
          setAddFieldModal(true)
        }
      }}
      onDelete={(id) => flow.deleteNode(id)}
    />
  ),
  sourceArrayGroup: (node: ArrayGroupNodeProperties) => (
    <ArrayGroupNode
      {...node}
      variant="source"
      onHighlight={(id) => flow.highlightFromPropertyNode(id)}
      onEdit={(data) => {
        if (data) {
          setEditingNode(data)
          openModelType.current = 'source'
          setAddFieldModal(true)
        }
      }}
      onDelete={(id) => flow.deleteNode(id)}
    />
  ),
  targetArrayGroup: (node: ArrayGroupNodeProperties) => (
    <ArrayGroupNode
      {...node}
      variant="target"
      onHighlight={(id) => flow.highlightFromPropertyNode(id)}
      onEdit={(data) => {
        if (data) {
          setEditingNode(data)
          openModelType.current = 'target'
          setAddFieldModal(true)
        }
      }}
      onDelete={(id) => flow.deleteNode(id)}
    />
  ),
  extraSourceNode: (node: ExtraSourceNodeProperties) => (
    <ExtraSourceNode
      {...node}
      onHighlight={(id) => flow.highlightFromPropertyNode(id)}
      onDelete={(id) => flow.deleteNode(id)}
    />
  ),
  mappingNode: (node: MappingNodeProperties) => (
    <MappingNode
      {...node}
      onClick={(id) => flow.highlightFromMappingNode(id)}
      onEdit={(data) => {
        setEditingMapping(data)
        openMapping()
      }}
      onDelete={(id) => {
        flow.deleteMapping(id)
      }}
    />
  ),
  arrayMappingNode: (node: ArrayMappingNodeProperties) => (
    <ArrayMappingNode
      {...node}
      onClick={(id) => flow.highlightFromMappingNode(id)}
      onDelete={(id) => {
        flow.deleteMapping(id)
      }}
    />
  ),
})
