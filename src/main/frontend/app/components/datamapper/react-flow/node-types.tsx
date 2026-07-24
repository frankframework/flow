import type { Dispatch, JSX, RefObject, SetStateAction } from 'react'
import OneEdgeNode, { type OneEdgeNodeProperties } from './one-edge-node'
import LabeledGroupNode, { type LabeledGroupNodeProperties } from './labeled-group-node'
import MappingNode, { type MappingNodeProperties } from './mapping-node'
import type { NodeTypes, Node } from '@xyflow/react'
import ExtraSourceNode, { type ExtraSourceNodeProperties } from './extra-source-node'
import type { useFlowManagement } from '~/hooks/use-datamapper-flow-management'
import type { CustomNodeData, MappingNodeData } from '~/types/datamapper_types/react-node-types'
import ArrayGroupNode, { type ArrayGroupNodeProperties } from './array-group-node'
import type { ArrayMappingNodeProperties } from './array-mapping-node'
import ArrayMappingNode from './array-mapping-node'
import ImportSchematicNode, { type ImportSchematicNodeprops } from './import-schematic-node'

type GetNodeTypesParameters = {
  flow: ReturnType<typeof useFlowManagement>
  setReactFlowNodes: Dispatch<SetStateAction<Node[]>>
  setEditingNode: Dispatch<SetStateAction<CustomNodeData | null>>
  setAddFieldModal: Dispatch<SetStateAction<boolean>>
  openModelType: RefObject<'source' | 'target'>
  setEditingMapping: Dispatch<SetStateAction<MappingNodeData | null>>
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
  sourceOnly: (properties: OneEdgeNodeProperties): JSX.Element => (
    <OneEdgeNode
      {...properties}
      data={{ ...properties.data, setNodes: setReactFlowNodes }}
      variant="source"
      onEdit={(data): void => {
        if (!data) {
          return
        }

        setEditingNode(data)
        openModelType.current = 'source'
        setAddFieldModal(true)
      }}
      onDelete={(id): void => flow.deleteNode(id)}
      onHighlight={(id): void => flow.highlightFromPropertyNode(id)}
    />
  ),
  targetOnly: (properties: OneEdgeNodeProperties): JSX.Element => (
    <OneEdgeNode
      {...properties}
      data={{ ...properties.data, setNodes: setReactFlowNodes }}
      variant="target"
      onEdit={(data): void => {
        if (!data) {
          return
        }

        setEditingNode(data)
        openModelType.current = 'target'
        setAddFieldModal(true)
      }}
      onDelete={(id): void => flow.deleteNode(id)}
      onHighlight={(id): void => flow.highlightFromPropertyNode(id)}
    />
  ),
  labeledGroup: (node: LabeledGroupNodeProperties): JSX.Element => (
    <LabeledGroupNode
      {...node}
      onHighlight={(id): void => flow.highlightFromPropertyNode(id)}
      onEdit={(data): void => {
        if (!data) {
          return
        }

        setEditingNode(data)
        openModelType.current = 'target'
        setAddFieldModal(true)
      }}
      onDelete={(id): void => flow.deleteNode(id)}
    />
  ),
  sourceArrayGroup: (node: ArrayGroupNodeProperties): JSX.Element => (
    <ArrayGroupNode
      {...node}
      variant="source"
      onHighlight={(id): void => flow.highlightFromPropertyNode(id)}
      onDelete={(id): void => flow.deleteNode(id)}
    />
  ),
  targetArrayGroup: (node: ArrayGroupNodeProperties): JSX.Element => (
    <ArrayGroupNode
      {...node}
      variant="target"
      onHighlight={(id): void => flow.highlightFromPropertyNode(id)}
      onDelete={(id): void => flow.deleteNode(id)}
    />
  ),
  extraSourceNode: (node: ExtraSourceNodeProperties): JSX.Element => (
    <ExtraSourceNode
      {...node}
      onHighlight={(id): void => flow.highlightFromPropertyNode(id)}
      onDelete={(id): void => flow.deleteNode(id)}
    />
  ),
  mappingNode: (node: MappingNodeProperties): JSX.Element => (
    <MappingNode
      {...node}
      onClick={(id): void => flow.highlightFromMappingNode(id)}
      onEdit={(data): void => {
        setEditingMapping(data)
        openMapping()
      }}
      onDelete={(id): void => {
        flow.deleteMapping(id)
      }}
    />
  ),
  arrayMappingNode: (node: ArrayMappingNodeProperties): JSX.Element => (
    <ArrayMappingNode
      {...node}
      onClick={(id): void => flow.highlightFromMappingNode(id)}
      onDelete={(id): void => {
        flow.deleteMapping(id)
      }}
    />
  ),
  importSchematicNode: (node: ImportSchematicNodeprops): JSX.Element => <ImportSchematicNode {...node} />,
})
