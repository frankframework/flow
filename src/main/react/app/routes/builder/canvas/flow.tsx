import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls, type Node,
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
import useFlowStore, {type FlowState} from "~/stores/flow-store";
import {useShallow} from "zustand/react/shallow";

export type FlowNode = FrankNode | StartNode | Node
const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});

export default function Flow() {
  const nodeTypes = { frankNode: FrankNodeComponent, exitNode: ExitNodeComponent, startNode: StartNodeComponent }
  const edgeTypes = { frankEdge: FrankEdgeComponent }

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore(
          useShallow(selector),
  );

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
