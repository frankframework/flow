import React, { useEffect, useRef } from 'react'
import HandleMenuItem from './handle-menu-item'
import { translateHandleTypeToColour } from './handle'
import type { ElementProperty } from '@frankframework/doc-library-core'
import { useHandleTypes } from '~/hooks/use-handle-types'
import { createPortal } from 'react-dom'
import { useReactFlow } from '@xyflow/react'

interface HandleMenuProperties {
  position: { x: number; y: number }
  onClose: () => void
  onSelect: (type: string) => void
  typesAllowed?: Record<string, ElementProperty>
}

const HandleMenu: React.FC<HandleMenuProperties> = ({ position, onClose, onSelect, typesAllowed }) => {
  const handleTypes = useHandleTypes(typesAllowed)

  const { getViewport } = useReactFlow()

  // Hooking into the viewport to detect if any panning/zooming was done in the flow canvas, which closes the menu
  useEffect(() => {
    let prev = getViewport()

    const interval = setInterval(() => {
      const next = getViewport()

      if (next.x !== prev.x || next.y !== prev.y || next.zoom !== prev.zoom) {
        onClose()
      }

      prev = next
    }, 0)

    return () => clearInterval(interval)
  }, [getViewport, onClose])

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

  useEffect(() => {
    const handleScroll = () => {
      console.log('Scrolling!')
      onClose()
    }

    globalThis.addEventListener('scroll', handleScroll, true)

    return () => {
      globalThis.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose])

  const handleClose = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={handleClose}>
      <div
        className="nodrag bg-background border-border absolute border shadow-md"
        style={{
          left: `${position.x + 10}px`, // offset to the right of cursor
          top: `${position.y - 5}px`,
        }}
      >
        <div className="w-70">
          <div className="border-border bg-muted h-10 border-b px-3 py-1 font-bold">Select Handle Type</div>
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
