import React, { useEffect } from 'react'
import HandleMenuItem from './handle-menu-item'
import { translateHandleTypeToColour } from './handle'
import type { ElementProperty } from '@frankframework/doc-library-core'
import { useHandleTypes } from '~/hooks/use-handle-types'
import { createPortal } from 'react-dom'

interface HandleMenuProperties {
  title: string
  position: { x: number; y: number }
  onClose: () => void
  onSelect: (type: string) => void
  typesAllowed?: Record<string, ElementProperty>
}

const HandleMenu: React.FC<HandleMenuProperties> = ({ title, position, onClose, onSelect, typesAllowed }) => {
  const handleTypes = useHandleTypes(typesAllowed)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    globalThis.addEventListener('keydown', handleEsc, { capture: true })

    return () => {
      globalThis.removeEventListener('keydown', handleEsc, { capture: true })
    }
  }, [onClose])

  const handleOverlayEvent = (event: React.MouseEvent<HTMLDivElement> | React.WheelEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onContextMenu={handleOverlayEvent}
      onClick={handleOverlayEvent}
      onWheel={handleOverlayEvent}
    >
      <div
        className="nodrag bg-background border-border absolute border shadow-md"
        style={{
          left: `${position.x + 10}px`, // offset to the right of cursor
          top: `${position.y - 5}px`,
        }}
      >
        <div className="w-70">
          <div className="border-border bg-muted h-10 border-b px-3 py-1 font-bold">{title}</div>
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
    </div>,
    document.body,
  )
}

export default HandleMenu
