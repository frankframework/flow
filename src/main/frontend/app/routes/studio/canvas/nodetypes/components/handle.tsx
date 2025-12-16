import { Handle, Position, useNodeConnections, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import HandleMenuItem from './handle-menu-item'
import type { ActionType } from './action-types'

interface HandleProperties {
  type: ActionType
  index: number
  firstHandlePosition: number
  handleSpacing: number
  onChangeType: (newType: ActionType) => void
  absolutePosition: { x: number; y: number }
}

export function translateHandleTypeToColour(type: ActionType): string {
  switch (type) {
    case 'success': {
      return '#68D250'
    }
    case 'failure': {
      return '#E84E4E'
    }
    case 'exception': {
      return '#424242'
    }
    case 'custom': {
      return '#1B97D1'
    }
    default: {
      return '#1B97D1'
    }
  }
}

export function CustomHandle(properties: Readonly<HandleProperties>) {
  const connections = useNodeConnections({ handleType: 'source', handleId: properties.index.toString() })
  const type = properties.type
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

  const handleMenuClick = (newType: ActionType) => {
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
          className="nodrag bg-background border-border absolute border shadow-md"
          style={{
            left: `${menuPosition.x + 10}px`, // offset to the right of cursor
            top: `${menuPosition.y - 5}px`,
          }}
        >
          <button
            className="border-border absolute -top-1 -right-1 rounded-full border bg-white text-gray-400 shadow-sm hover:border-red-400 hover:text-red-400"
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
          <div className="w-37">
            <div className="border-border bg-muted border-b px-3 py-1 text-xs font-bold">Change Handle Type</div>
            <ul className="w-full">
              <HandleMenuItem
                label="Success"
                iconColor={translateHandleTypeToColour('success')}
                onClick={() => handleMenuClick('success')}
              />
              <HandleMenuItem
                label="Failure"
                iconColor={translateHandleTypeToColour('failure')}
                onClick={() => handleMenuClick('failure')}
              />
              <HandleMenuItem
                label="Exception"
                iconColor={translateHandleTypeToColour('exception')}
                onClick={() => handleMenuClick('exception')}
              />
              <HandleMenuItem
                label="Custom"
                iconColor={translateHandleTypeToColour('custom')}
                onClick={() => handleMenuClick('custom')}
                isLast
              />
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
