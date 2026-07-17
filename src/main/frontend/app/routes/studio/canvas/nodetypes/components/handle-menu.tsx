import React, { useEffect, useRef } from 'react'
import HandleMenuItem from './handle-menu-item'
import { translateHandleTypeToColour } from './handle'
import type { ElementProperty } from '@frankframework/doc-library-core'
import { useHandleTypes } from '~/hooks/use-handle-types'
import { createPortal } from 'react-dom'

type HandleMenuProperties = {
  title: string
  position: { x: number; y: number }
  onClose: () => void
  onSelect: (type: string) => void
  typesAllowed?: Record<string, ElementProperty>
}

export default function HandleMenu({
  title,
  position,
  onClose,
  onSelect,
  typesAllowed,
}: Readonly<HandleMenuProperties>): React.ReactPortal {
  const handleTypes = useHandleTypes(typesAllowed)
  const menuReference = useRef<HTMLDivElement>(null)

  useEffect((): (() => void) => {
    const handleMouseDown = (e: MouseEvent): void => {
      if (menuReference.current && !menuReference.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleWheel = (e: WheelEvent): void => {
      if (menuReference.current && !menuReference.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return
      }

      e.stopPropagation()
      onClose()
    }

    globalThis.addEventListener('keydown', handleEsc, { capture: true })
    globalThis.addEventListener('mousedown', handleMouseDown, { capture: true })
    globalThis.addEventListener('wheel', handleWheel, { capture: true })

    return (): void => {
      globalThis.removeEventListener('keydown', handleEsc, { capture: true })
      globalThis.removeEventListener('mousedown', handleMouseDown, { capture: true })
      globalThis.removeEventListener('wheel', handleWheel, { capture: true })
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuReference}
      className="nodrag bg-background border-border absolute rounded border shadow-md"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y - 5}px`,
      }}
    >
      <div className="w-70">
        <div className="border-border text-foreground-muted mt-[1px] flex h-10 items-center border-b p-2 text-xs font-semibold tracking-wide uppercase">
          {title}
        </div>
        <ul className="w-full">
          {handleTypes.map((type, index): React.JSX.Element => (
            <HandleMenuItem
              key={type}
              label={type}
              iconColor={translateHandleTypeToColour(type)}
              onClick={(): void => onSelect(type)}
              isLast={index === handleTypes.length - 1}
            />
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
