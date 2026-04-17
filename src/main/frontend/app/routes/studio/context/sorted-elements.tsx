import React, { useCallback, useRef, useState } from 'react'
import ArrowDownIcon from 'icons/solar/Alt Arrow Down.svg?react'
import ArrowRightIcon from 'icons/solar/Alt Arrow Right.svg?react'
import { useSettingsStore } from '~/stores/settings-store'
import useNodeContextStore from '~/stores/node-context-store'
import type { ElementDetails } from '@frankframework/doc-library-core'
import { getElementTypeFromName } from '../node-translator-module'
import DangerIcon from '../../../../icons/solar/Danger Triangle.svg?react'
import { DeprecatedListPopover, type DeprecatedInfo } from './deprecated-list-popover'
import ElementHoverCard from './element-hover-card'
import { showWarningToast } from '~/components/toast'
import Button from '~/components/inputs/button'

interface Properties {
  type: string
  items: ElementDetails[]
  onDragStart: (item: ElementDetails) => React.DragEventHandler<HTMLLIElement>
  searchTerm: string
}

const CLOSE_DELAY = 200

export default function SortedElements({ type, items, onDragStart, searchTerm }: Readonly<Properties>) {
  const paletteExpandedByDefault = useSettingsStore((state) => state.studio.paletteExpandedByDefault)
  const [isExpanded, setIsExpanded] = useState(paletteExpandedByDefault)
  const { draggedName, setDraggedName, dropSuccessful, setDropSuccessful } = useNodeContextStore((state) => state)
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)
  const [hoveredElement, setHoveredElement] = useState<ElementDetails | null>(null)
  const [deprecatedRect, setDeprecatedRect] = useState<DOMRect | null>(null)
  const [deprecatedHovered, setDeprecatedHovered] = useState<DeprecatedInfo | null>(null)
  const [lockedElement, setLockedElement] = useState<ElementDetails | null>(null)

  const lockedElementRef = useRef<ElementDetails | null>(null)
  lockedElementRef.current = lockedElement
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimeoutRef.current = setTimeout(() => {
      if (lockedElementRef.current) return

      setHoveredElement(null)
      setHoveredRect(null)
    }, CLOSE_DELAY)
  }, [cancelClose])

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded)
  }

  const shouldExpand = searchTerm !== '' || isExpanded

  const onDragEnd = (event: React.DragEvent<HTMLLIElement>) => {
    setDraggedName(null)
    const x = event.clientX
    const y = event.clientY

    const targetElement = document.elementFromPoint(x, y)
    const isInsideCanvas = targetElement?.closest('#flow-canvas')

    if (!dropSuccessful && draggedName && isInsideCanvas) {
      showWarningToast(`Element "${draggedName}" is not allowed to be dropped on the canvas`)
      console.warn(`Element "${draggedName}" could not be dropped on the canvas`)
    }
  }

  return (
    <div key={type} className="mb-2">
      <Button
        onClick={toggleExpansion}
        className="text-foreground-muted hover:text-foreground-active hover:bg-hover flex w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-3 py-3 text-left text-sm font-semibold capitalize transition-colors"
        style={{ borderLeft: `3px solid var(--palette-${type.toLowerCase()})` }}
      >
        {shouldExpand ? (
          <ArrowDownIcon className="h-4 w-4 shrink-0 fill-current" />
        ) : (
          <ArrowRightIcon className="h-4 w-4 shrink-0 fill-current" />
        )}
        <span className="min-w-0 flex-1 truncate">{type}</span>
        <span className="text-foreground-muted shrink-0 text-xs tabular-nums">{items.length}</span>
      </Button>

      {shouldExpand && (
        <div className="mt-1 space-y-0.5 pl-3">
          {items.map((value) => {
            const elementType = getElementTypeFromName(value.name)

            return (
              <li
                key={value.name}
                className="text-foreground hover:bg-hover group mb-1 flex cursor-move items-center justify-between rounded-sm py-3 pr-3 pl-3 text-sm transition-colors"
                style={{ borderLeft: `3px solid var(--type-${elementType})` }}
                draggable
                onDragStart={(event) => {
                  cancelClose()
                  setHoveredRect(null)
                  setHoveredElement(null)
                  setLockedElement(null)
                  setDropSuccessful(false)
                  onDragStart(value)(event)
                }}
                onDragEnd={onDragEnd}
                onMouseEnter={(event) => {
                  cancelClose()
                  if (lockedElement?.name !== value.name) {
                    setLockedElement(null)
                  }
                  const rect = event.currentTarget.getBoundingClientRect()
                  setHoveredRect(rect)
                  setHoveredElement(value)
                }}
                onMouseLeave={() => {
                  scheduleClose()
                }}
              >
                <span className="min-w-0 truncate">{value.name}</span>

                {value.deprecated && (
                  <div
                    className="ml-2 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                    onMouseEnter={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect()
                      setDeprecatedRect(rect)
                      setDeprecatedHovered(value.deprecated!)
                    }}
                    onMouseLeave={() => {
                      setDeprecatedRect(null)
                      setDeprecatedHovered(null)
                    }}
                  >
                    <DangerIcon />
                    {deprecatedRect && deprecatedHovered && (
                      <DeprecatedListPopover deprecated={deprecatedHovered} anchorRect={deprecatedRect} />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </div>
      )}

      {(hoveredRect && hoveredElement) || lockedElement ? (
        <ElementHoverCard
          key={(lockedElement ?? hoveredElement)!.name}
          anchorRect={hoveredRect!}
          element={lockedElement ?? hoveredElement!}
          isLocked={!!lockedElement}
          onComplete={() => setLockedElement(hoveredElement)}
          onUnlock={() => {
            setLockedElement(null)
            setHoveredElement(null)
            setHoveredRect(null)
          }}
          onEnter={() => {
            cancelClose()
            setLockedElement((prev) => prev ?? hoveredElement)
          }}
          onLeave={() => {
            setLockedElement(null)
            scheduleClose()
          }}
        />
      ) : null}
    </div>
  )
}
