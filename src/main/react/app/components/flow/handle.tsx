import { Handle, Position, useNodeConnections, useReactFlow } from '@xyflow/react'
import { useState } from 'react'

interface HandleProperties {
  type: string
  index: number
  firstHandlePosition: number
  handleSpacing: number
  onChangeType: (newType: string) => void
  absolutePosition: { x: number; y: number }
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
  const connections = useNodeConnections({ handleType: 'source', handleId: properties.index.toString() })
  const [type, setType] = useState(properties.type)
  const reactFlow = useReactFlow()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleClick = (event: React.MouseEvent) => {
    const { clientX, clientY } = event
    const { screenToFlowPosition } = reactFlow
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY })
    setMenuPosition({
      x: flowPosition.x - properties.absolutePosition.x,
      y: flowPosition.y - properties.absolutePosition.y,
    })
    setIsMenuOpen(!isMenuOpen) // Toggle menu visibility
  }

  const handleMenuClick = (newType: string) => {
    properties.onChangeType(newType) // Change the handle type
    setIsMenuOpen(false) // Close the menu after selection
  }

  return (
    <div>
      <div>
        <Handle
          type={'source'}
          position={Position.Right}
          key={properties.index}
          id={properties.index.toString()}
          className="flex cursor-pointer items-center justify-center text-white"
          isConnectableStart={connections.length === 0}
          isConnectableEnd={connections.length === 0}
          onClick={handleClick}
          style={{
            top: `${properties.firstHandlePosition + properties.index * properties.handleSpacing}px`,
            right: '-15px',
            width: '15px',
            height: '15px',
            backgroundColor: translateHandleTypeToColour(type),
            border: '1px solid rgba(107, 114, 128, 0.5)',
            pointerEvents: 'all',
          }}
        />
      </div>

      {isMenuOpen && (
        <div
          className="nodrag absolute rounded-md border bg-white shadow-md"
          style={{
            left: `${menuPosition.x + 10}px`,
            top: `${menuPosition.y + 10}px`,
          }}
        >
          <ul>
            <button
              className="absolute -top-1 -right-1 rounded-full border border-gray-300 bg-white text-gray-400 shadow-sm hover:border-red-400 hover:text-red-400"
              onClick={() => setIsMenuOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                strokeWidth="1"
                stroke="currentColor"
                strokeLinecap="round"
              >
                <line x1="3" y1="3" x2="7" y2="7" />
                <line x1="3" y1="7" x2="7" y2="3" />
              </svg>
            </button>
            <li
              className="cursor-pointer rounded-t-md p-2 hover:bg-gray-200"
              onClick={() => handleMenuClick('success')}
            >
              Success
            </li>
            <li className="cursor-pointer p-2 hover:bg-gray-200" onClick={() => handleMenuClick('failure')}>
              Failure
            </li>
            <li className="cursor-pointer p-2 hover:bg-gray-200" onClick={() => handleMenuClick('exception')}>
              Exception
            </li>
            <li className="cursor-pointer rounded-b-md p-2 hover:bg-gray-200" onClick={() => handleMenuClick('custom')}>
              Custom
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
