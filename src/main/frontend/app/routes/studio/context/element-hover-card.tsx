import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ElementDetails } from '~/types/ff-doc.types'

interface ElementHoverCardProps {
  anchorRect: DOMRect
  element: ElementDetails
  isLocked: boolean
  onComplete?: () => void
  onUnlock?: () => void
}

export default function ElementHoverCard({
  anchorRect,
  element,
  isLocked,
  onComplete,
  onUnlock,
}: ElementHoverCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [fillWidth, setFillWidth] = useState(0)
  const offset = 10 // distance between anchor and tooltip

  useLayoutEffect(() => {
    if (!ref.current) return

    const tooltipWidth = ref.current.offsetWidth

    if (anchorRect === null) return
    const top = anchorRect.top + anchorRect.height / 2
    const left = anchorRect.left - tooltipWidth

    setPosition({ top, left })
  }, [anchorRect])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFillWidth(100)
    }, 50)
    return () => clearTimeout(timeout)
  }, [onComplete])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isLocked) return
      if (!ref.current) return

      if (!ref.current.contains(event.target as Node)) {
        onUnlock?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isLocked, onUnlock])

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left - offset,
        transform: 'translateY(-50%)',
        pointerEvents: isLocked ? 'auto' : 'none',
        zIndex: 50,
      }}
      className="border-border bg-background flex max-h-[70vh] max-w-[40vw] flex-col rounded-md border text-sm shadow-lg"
    >
      <div className="bg-backdrop h-[4px] w-full flex-shrink-0">
        <div
          className="bg-foreground-active h-full transition-all duration-1000 ease-linear"
          style={{ width: `${fillWidth}%` }}
          onTransitionEnd={() => {
            if (fillWidth === 100) {
              onComplete?.()
            }
          }}
        />
      </div>
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-5">
        <p className="text-foreground-muted">{element.labels.Components}</p>
        <h2 className="mb-2 font-semibold">{element.name}</h2>
        <div className="py-2">
          {element.labels &&
            Object.entries(element.labels).map(([key, value]) => (
              <span
                key={key}
                className={'mr-1 rounded-full border p-2'}
                style={{
                  backgroundColor: `var(--label-${key.toLowerCase()})`,
                  borderColor: `var(--label-border-${key.toLowerCase()})`,
                }}
              >
                {value}
              </span>
            ))}
        </div>
        {element.description && <p className="text-sm" dangerouslySetInnerHTML={{ __html: element.description }} />}
      </div>
    </div>,
    document.body,
  )
}
