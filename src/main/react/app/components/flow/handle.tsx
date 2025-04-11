import { Handle, Position } from '@xyflow/react'

interface HandleProperties {
  type: string
  index: number
  firstHandlePosition: number
  handleSpacing: number
}

function translateHandleTypeToColour(type: string): string {
  switch (type.toLowerCase()) {
    case 'success': {
      return '#68D250'
    }
    case 'failure': {
      return '#E84E4E'
    }
    case 'exception': {
      return '#424242'
    }
    case 'informational': {
      return '#848484'
    }
    default: {
      return '#1B97D1'
    }
  }
}

export function CustomHandle(properties: Readonly<HandleProperties>) {
  const bgColor = translateHandleTypeToColour(properties.type)
  return (
    <Handle
      type={'source'}
      position={Position.Right}
      key={properties.index}
      id={properties.index.toString()}
      className="flex items-center justify-center text-white"
      style={{
        top: `${properties.firstHandlePosition + properties.index * properties.handleSpacing}px`,
        right: '-15px',
        width: '15px',
        height: '15px',
        backgroundColor: bgColor,
        border: '1px solid rgba(107, 114, 128, 0.5)',
      }}
    />
  )
}
