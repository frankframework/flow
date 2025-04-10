import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  type OnNodesChange,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useState } from 'react'

import { initialNodes } from '~/routes/builder/canvas/nodes'
import { initialEdges } from '~/routes/builder/canvas/edges'
import FrankNodeComponent, { type FrankNode } from '~/routes/builder/canvas/nodetypes/frank-node'
import FrankEdgeComponent from '~/routes/builder/canvas/frank-edge'
import ExitNodeComponent from '~/routes/builder/canvas/nodetypes/exit-node'
import StartNodeComponent, { type StartNode } from '~/routes/builder/canvas/nodetypes/start-node'

type CustomNode = FrankNode | StartNode

export default function Flow() {
  const nodeTypes = { frankNode: FrankNodeComponent, exitNode: ExitNodeComponent, startNode: StartNodeComponent }
  const edgeTypes = { frankEdge: FrankEdgeComponent }

  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)

  const onNodesChange: OnNodesChange<CustomNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )

  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])

  const onConnect = useCallback((parameters: any) => setEdges((eds) => addEdge(parameters, eds)), [])

  return (
    <div style={{ height: '100%' }}>
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
      >
        <Controls position="top-left"></Controls>
        <Background variant={BackgroundVariant.Dots} size={2}></Background>
      </ReactFlow>
    </div>
  )
}
