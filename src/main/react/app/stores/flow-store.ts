import { create } from 'zustand';
import {
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect, applyNodeChanges, applyEdgeChanges, addEdge,
} from '@xyflow/react';

import { initialNodes } from '~/routes/builder/canvas/nodes';
import { initialEdges } from '~/routes/builder/canvas/edges';
import type { FlowNode } from '~/routes/builder/canvas/flow';
import type { FrankNode } from '~/routes/builder/canvas/nodetypes/frank-node';

export type FlowState = {
  nodes: FlowNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  incrementSrcHandles: (nodeId: string) => void;
};

function isFrankNode(node: FlowNode): node is FrankNode {
  return node.type === 'frankNode'
}

const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setNodes: (nodes) => {
    set({ nodes });
  },
  setEdges: (edges) => {
    set({ edges });
  },
  incrementSrcHandles: (nodeId: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && isFrankNode(node)) {
          return {...node, data: {...node.data, srcHandleAmount: node.data.srcHandleAmount + 1}};
        }
        return node
      })
    })
  }
}))

export default useFlowStore;
