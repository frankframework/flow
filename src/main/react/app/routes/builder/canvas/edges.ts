export const initialEdges = [
  {
    id: '0-1',
    source: '0',
    target: '1',
    data: {
      label: 'START',
    },
    type: 'frankEdge',
  },
  {
    id: '1-2',
    source: '1',
    target: '2',
    data: {
      label: 'SUCCESS',
    },
    type: 'frankEdge',
  },
  {
    id: '2-3',
    source: '2',
    target: '3',
    data: {
      label: 'SUCCESS',
    },
    type: 'frankEdge',
  },
  {
    id: '3-4',
    source: '3',
    target: '4',
    data: {
      label: 'SUCCESS',
    },
    type: 'frankEdge',
  },
  {
    id: '4-5',
    source: '4',
    target: '5',
    data: {
      label: 'SUCCESS',
    },
    type: 'frankEdge',
  },
  {
    id: '3-6',
    source: '3',
    sourceHandle: '2',
    target: '6',
    data: {
      label: 'FAILURE',
    },
    type: 'frankEdge',
  },
]
