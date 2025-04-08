import {
  applyNodeChanges,
  ReactFlow,
  type NodeChange,
  addEdge,
  applyEdgeChanges,
  type OnEdgesChange, type OnNodesChange
} from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import {useCallback, useState} from "react";

import {initialNodes} from "~/routes/builder/canvas/nodes";
import {initialEdges} from "~/routes/builder/canvas/edges";
import FrankNodeComponent, {type FrankNode } from "~/routes/builder/canvas/frank-node";
import FrankEdgeComponent from "~/routes/builder/canvas/frank-edge";

export default function Flow() {

  const nodeTypes = {frankNode: FrankNodeComponent}
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
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes}/>
          </div>
  )
}
