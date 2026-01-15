import React from 'react'
import HandleMenuItem from './handle-menu-item'
import { translateHandleTypeToColour } from './handle'
import type { ElementProperty } from '@frankframework/ff-doc'
import { useHandleTypes } from '~/hooks/use-handle-types'

interface HandleMenuProperties {
  position: { x: number; y: number }
  onClose: () => void
  onSelect: (type: string) => void
  typesAllowed?: Record<string, ElementProperty>
}

const HandleMenu: React.FC<HandleMenuProperties> = ({ position, onClose, onSelect, typesAllowed }) => {
  const handleTypes = useHandleTypes(typesAllowed)

  return (
    <div
      className="nodrag bg-background border-border absolute border shadow-md"
      style={{
        left: `${position.x + 10}px`, // offset to the right of cursor
        top: `${position.y - 5}px`,
      }}
    >
      <button
        className="border-border bg-background absolute -top-1 -right-1 rounded-full border text-gray-400 shadow-sm hover:cursor-pointer hover:border-red-400 hover:text-red-400"
        onClick={onClose}
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
      <div className="w-35">
        <div className="border-border bg-muted border-b px-3 py-1 text-xs font-bold">Select Handle Type</div>
        <ul className="w-full">
          {handleTypes.map((type, index) => (
            <HandleMenuItem
              key={type}
              label={type}
              iconColor={translateHandleTypeToColour(type)}
              onClick={() => onSelect(type)}
              isLast={index === handleTypes.length - 1}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default HandleMenu
