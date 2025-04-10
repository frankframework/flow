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

export type FlowState = {
  nodes: FlowNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateSrcHandles: (nodeId: string) => void;
};

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
  updateSrcHandles: (nodeId: string) => {

  }
}))

export default useFlowStore;
