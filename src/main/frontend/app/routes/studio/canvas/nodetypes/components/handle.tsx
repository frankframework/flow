import { Handle, Position, useNodeConnections } from '@xyflow/react'
import { useState } from 'react'
import type { ElementProperty } from '@frankframework/doc-library-core'
import HandleMenu from './handle-menu'

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

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleClick = (event: React.MouseEvent) => {
    const { clientX, clientY } = event
    setMenuPosition({
      x: clientX,
      y: clientY,
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
        <HandleMenu
          title="Change Handle Type"
          position={menuPosition}
          onClose={() => setIsMenuOpen(false)}
          onSelect={handleMenuClick}
          typesAllowed={properties.typesAllowed}
        />
      )}
    </div>
  )
}
