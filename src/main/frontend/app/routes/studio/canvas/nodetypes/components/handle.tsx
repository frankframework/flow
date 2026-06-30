import { Handle, Position, useNodeConnections } from '@xyflow/react'
import { useState } from 'react'
import type { ElementProperty } from '@frankframework/doc-library-core'
import HandleMenu from './handle-menu'

type HandleProperties = {
  type: string
  index: number
  firstHandlePosition: number
  handleSpacing: number
  onChangeType: (newType: string) => void
  absolutePosition: { x: number; y: number }
  typesAllowed?: Record<string, ElementProperty>
}

const SEMANTIC_COLOURS: Record<string, string> = {
  success: '#68D250',
  failure: '#E84E4E',
  exception: '#424242',
  timeout: '#F2A900',
  error: '#ff7605ff',
}

const FORWARD_COLOURS: Record<string, string> = {
  notfound: '#1B97D1',
  empty: '#26A69A',
  // eslint-disable-next-line unicorn/no-thenable
  then: '#7E57C2',
  else: '#EC407A',
  lessthan: '#5C6BC0',
  greaterthan: '#00ACC1',
  equals: '#AB47BC',
  stop: '#D81B60',
  continue: '#42A5F5',
  notinrole: '#8D6E63',
  custom: '#9575CD',
}

const FALLBACK_PALETTE = Object.values(FORWARD_COLOURS)

function colourFromName(type: string): string {
  let hash = 0
  for (let index = 0; index < type.length; index++) {
    hash = (hash * 31 + (type.codePointAt(index) ?? 0)) % FALLBACK_PALETTE.length
  }
  return FALLBACK_PALETTE[hash]
}

export function translateHandleTypeToColour(type: string): string {
  const normalized = type.toLowerCase()

  if (normalized in FORWARD_COLOURS) return FORWARD_COLOURS[normalized]

  for (const [suffix, colour] of Object.entries(SEMANTIC_COLOURS)) {
    if (normalized.endsWith(suffix)) return colour
  }

  return colourFromName(normalized)
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
