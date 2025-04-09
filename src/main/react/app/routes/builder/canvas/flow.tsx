import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  type OnNodesChange,
  ReactFlow
} from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import {useCallback, useState} from "react";

import {initialNodes} from "~/routes/builder/canvas/nodes";
import {initialEdges} from "~/routes/builder/canvas/edges";
import FrankNodeComponent, {type FrankNode} from "~/routes/builder/canvas/frank-node";
import FrankEdgeComponent from "~/routes/builder/canvas/frank-edge";
import ExitNodeComponent from "~/routes/builder/canvas/exit-node";

export default function Flow() {

  const nodeTypes = {frankNode: FrankNodeComponent, exitNode: ExitNodeComponent}
  const edgeTypes = {frankEdge: FrankEdgeComponent}

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange: OnNodesChange<FrankNode> = useCallback(
          (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
          [],
  );

  const onEdgesChange = useCallback(
          (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
          [],
  );

  const onConnect = useCallback(
          (params: any) => setEdges((eds) => addEdge(params, eds)),
          [],
  );

  return (
          <div style={{ height: '100%' }}>
            <ReactFlow fitView nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes}>
              <Controls position="top-left"></Controls>
              <Background variant={BackgroundVariant.Dots} size={2}></Background>
            </ReactFlow>
          </div>
  )
}
