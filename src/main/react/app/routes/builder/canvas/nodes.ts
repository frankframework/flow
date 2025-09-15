import type { Node } from '@xyflow/react'

export const initialNodes: Node[] = [
  {
    id: '0',
    position: { x: 0, y: 0 },
    data: {
      subtype: 'Receiver',
      type: 'Receiver',
      name: 'Update Temperature',
      sourceHandles: [{ type: 'success', index: 1 }],
      children: [
        {
          id: '6',
          subtype: 'JavaListener',
          type: 'Listener',
          name: 'Update Temperature',
        },
      ],
    },
    type: 'frankNode',
  },
  {
    id: '1',
    position: { x: 450, y: 0 },
    data: {
      subtype: 'Senderpipe',
      type: 'Pipe',
      name: 'Get temperature from OpenWeather',
      sourceHandles: [{ type: 'success', index: 1 }],
      children: [
        {
          id: '7',
          subtype: 'HttpSender',
          type: 'Sender',
          attributes: {
            url: 'http://api.openweathermap.org/data/2.5/weather?q=Rotterdam&amp;units=metric&amp;mode=xml&amp;appid=${openweathermap.appid}',
          },
        },
      ],
    },
    type: 'frankNode',
  },
  {
    id: '2',
    position: { x: 900, y: 0 },
    data: {
      subtype: 'XsltPipe',
      type: 'Pipe',
      name: 'Xml to Json',
      sourceHandles: [
        { type: 'success', index: 1 },
        { type: 'failure', index: 2 },
      ],
      attributes: {
        xpathExpression: "concat('{&quot;temperature&quot;:', /current/temperature/@value, '}')",
      },
      children: [],
    },
    type: 'frankNode',
  },
  {
    id: '3',
    position: { x: 1350, y: -200 },
    data: {
      subtype: 'SenderPipe',
      type: 'Pipe',
      name: 'Post temperature to ThingsBoard',
      sourceHandles: [{ type: 'success', index: 1 }],
      children: [
        {
          id: '8',
          subtype: 'HttpSender',
          type: 'Sender',
          attributes: {
            url: 'https://demo.thingsboard.io/api/v1/${thingsboard.apikey}/telemetry',
            methodType: 'POST',
            contentType: 'application/json',
          },
        },
      ],
    },
    type: 'frankNode',
  },
  {
    id: '4',
    position: { x: 1800, y: 0 },
    data: {
      subtype: 'Exit',
      type: 'Exit',
      name: 'Ready',
    },
    type: 'exitNode',
  },
  {
    id: '5',
    position: { x: 1800, y: 200 },
    data: {
      subtype: 'Exit',
      type: 'Exit',
      name: 'Failure',
    },
    type: 'exitNode',
  },
]
