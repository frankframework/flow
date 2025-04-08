import type { FrankNode } from '~/routes/builder/canvas/frank-node';

export const initialNodes: FrankNode[] = [{
  id: '1',
  position: {x: 0, y: 0},
  data: {
    subtype: 'JavaListener',
    type: 'Listener',
    name: 'Update Temperature',
    amountOfEdges: 1,
  },
  type: 'frankNode'
}, {
  id: '2',
  position: {x: 250, y: 0},
  data: {
    subtype: 'HttpSender',
    type: 'Sender',
    name: 'Get temperature from OpenWeather',
    amountOfEdges: 1,
  },
  type: 'frankNode'
}, {
  id: '3',
  position: {x: 500, y: 0},
  data: {
    subtype: 'XsltPipe',
    type: 'Sender',
    name: 'Xml to Json',
    amountOfEdges: 1,
  },
  type: 'frankNode'
}, {
  id: '4',
  position: {x: 750, y: 0},
  data: {
    subtype: 'HttpSender',
    type: 'Sender',
    name: 'Post temperature to ThingsBoard',
    amountOfEdges: 1,
  },
  type: 'frankNode'
}]
