import type { Node } from '@xyflow/react'

export const initialNodes: Node[] = [
  {
    id: '0',
    position: { x: -450, y: 0 },
    data: {},
    type: 'startNode',
  },
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: {
      subtype: 'Receiver',
      type: 'Receiver',
      name: 'Update Temperature',
      srcHandleAmount: 1,
      children: [
        {
          subtype: 'JavaListener',
          type: 'Listener',
          name: 'Update Temperature',
        },
      ],
    },
    type: 'frankNode',
  },
  {
    id: '2',
    position: { x: 450, y: 0 },
    data: {
      subtype: 'Senderpipe',
      type: 'Pipe',
      name: 'Get temperature from OpenWeather',
      srcHandleAmount: 1,
      children: [
        {
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
    id: '3',
    position: { x: 900, y: 0 },
    data: {
      subtype: 'XsltPipe',
      type: 'Pipe',
      name: 'Xml to Json',
      srcHandleAmount: 1,
      attributes: {
        xpathExpression: "concat('{&quot;temperature&quot;:', /current/temperature/@value, '}')",
      },
      children: [],
    },
    type: 'frankNode',
  },
  {
    id: '4',
    position: { x: 1350, y: 0 },
    data: {
      subtype: 'SenderPipe',
      type: 'Pipe',
      name: 'Post temperature to ThingsBoard',
      srcHandleAmount: 1,
      children: [
        {
          subtype: 'HttpSender',
          type: 'Sender',
          attributes: {
            url: 'https://demo.thingsboard.io/api/v1/${thingsboard.apikey}/telemetry',
            methodType: 'POST',
            contentType: 'application/json',
          },
        },
        {
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
    id: '5',
    position: { x: 1800, y: 0 },
    data: {
      subtype: 'Exit',
      type: 'Exit',
      name: 'Ready',
    },
    type: 'exitNode',
  },
]
