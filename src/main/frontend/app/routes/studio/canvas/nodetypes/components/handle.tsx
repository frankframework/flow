import { Handle, Position, useNodeConnections, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import HandleMenuItem from './handle-menu-item'
import type { ElementProperty } from '@frankframework/ff-doc'
import { useHandleTypes } from '~/hooks/use-handle-types'

interface HandleProperties {
  type: string
  index: number
  firstHandlePosition: number
  handleSpacing: number
  onChangeType: (newType: string) => void
  absolutePosition: { x: number; y: number }
  typesAllowed?: Record<string, ElementProperty>
}

const HANDLE_TYPE_COLOURS: Record<string, string> = {
  success: '#68D250',
  failure: '#E84E4E',
  exception: '#424242',
  timeout: '#F2A900',
  error: '#ff7605ff',
  default: '#1B97D1',
}

export function translateHandleTypeToColour(type: string): string {
  const normalized = type.toLowerCase()

  for (const [suffix, colour] of Object.entries(HANDLE_TYPE_COLOURS)) {
    if (normalized.endsWith(suffix)) {
      return colour
    }
  }

  return HANDLE_TYPE_COLOURS.default
}

export function CustomHandle(properties: Readonly<HandleProperties>) {
  const connections = useNodeConnections({ handleType: 'source', handleId: properties.index.toString() })
  const type = properties.type
  const reactFlow = useReactFlow()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const handleTypes = useHandleTypes(properties.typesAllowed)

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
              {handleTypes.map((type, index) => (
                <HandleMenuItem
                  key={type}
                  label={type}
                  iconColor={translateHandleTypeToColour(type)}
                  onClick={() => handleMenuClick(type)}
                  isLast={index === handleTypes.length - 1}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
