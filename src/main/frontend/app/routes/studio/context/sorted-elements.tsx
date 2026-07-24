import React, { useCallback, useRef, useState } from 'react'
import ArrowDownIcon from 'icons/solar/Alt Arrow Down.svg?react'
import ArrowRightIcon from 'icons/solar/Alt Arrow Right.svg?react'
import useToasts from '~/components/toast/use-toasts'
import { type NodeContextStore } from '~/stores/node-context-store'
import { useSettingsStore } from '~/stores/settings-store'
import useNodeContextStore from '~/stores/node-context-store'
import type { ElementDetails } from '@frankframework/doc-library-core'
import { getElementTypeFromName } from '../node-translator-module'
import DangerIcon from '../../../../icons/solar/Danger Triangle.svg?react'
import { DeprecatedListPopover, type DeprecatedInfo } from './deprecated-list-popover'
import ElementHoverCard from './element-hover-card'
import Button from '~/components/inputs/button'

type Properties = {
  type: string
  items: ElementDetails[]
  onDragStart: (item: ElementDetails) => React.DragEventHandler<HTMLLIElement>
  searchTerm: string
}

const CLOSE_DELAY = 200

export default function SortedElements({
  type,
  items,
  onDragStart,
  searchTerm,
}: Readonly<Properties>): React.JSX.Element {
  const paletteExpandedByDefault = useSettingsStore((state): boolean => state.studio.paletteExpandedByDefault)
  const [isExpanded, setIsExpanded] = useState(paletteExpandedByDefault)
  const { draggedName, setDraggedName, dropSuccessful, setDropSuccessful } = useNodeContextStore(
    (state): NodeContextStore => state,
  )
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)
  const [hoveredElement, setHoveredElement] = useState<ElementDetails | null>(null)
  const [deprecatedRect, setDeprecatedRect] = useState<DOMRect | null>(null)
  const [deprecatedHovered, setDeprecatedHovered] = useState<DeprecatedInfo | null>(null)
  const [lockedElement, setLockedElement] = useState<ElementDetails | null>(null)

  const lockedElementReference = useRef<ElementDetails | null>(null)
  lockedElementReference.current = lockedElement
  const closeTimeoutReference = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { showWarningToast } = useToasts()

  const cancelClose = useCallback((): void => {
    if (closeTimeoutReference.current === null) {
      return
    }

    clearTimeout(closeTimeoutReference.current)
    closeTimeoutReference.current = null
  }, [])

  const scheduleClose = useCallback((): void => {
    cancelClose()
    closeTimeoutReference.current = setTimeout((): void => {
      if (lockedElementReference.current) return

      setHoveredElement(null)
      setHoveredRect(null)
    }, CLOSE_DELAY)
  }, [cancelClose])

  const toggleExpansion = (): void => {
    setIsExpanded(!isExpanded)
  }

  const shouldExpand = searchTerm !== '' || isExpanded

  const onDragEnd = (event: React.DragEvent<HTMLLIElement>): void => {
    setDraggedName(null)
    const x = event.clientX
    const y = event.clientY

    const targetElement = document.elementFromPoint(x, y)
    const isInsideCanvas = targetElement?.closest('#flow-canvas')

    if (!dropSuccessful && draggedName && isInsideCanvas) {
      const errorMessage = `Element "${draggedName}" could not be dropped on the canvas`
      showWarningToast(errorMessage)
      console.warn(errorMessage)
    }
  }

  return (
    <div key={type} className="mb-2">
      <Button
        onClick={toggleExpansion}
        className="text-foreground-muted hover:text-foreground hover:bg-hover flex w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-3 py-3 text-left text-sm font-semibold capitalize"
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
          {items.map((value): React.JSX.Element => {
            const elementType = getElementTypeFromName(value.name)

            return (
              <li
                key={value.name}
                className="text-foreground dark:text-foreground-muted hover:text-foreground hover:bg-hover group mb-1 flex cursor-move items-center justify-between rounded-sm py-3 pr-3 pl-3 text-sm"
                style={{ borderLeft: `3px solid var(--type-${elementType})` }}
                draggable
                onDragStart={(event): void => {
                  cancelClose()
                  setHoveredRect(null)
                  setHoveredElement(null)
                  setLockedElement(null)
                  setDropSuccessful(false)
                  onDragStart(value)(event)
                }}
                onDragEnd={onDragEnd}
                onMouseEnter={(event): void => {
                  cancelClose()
                  if (lockedElement?.name !== value.name) {
                    setLockedElement(null)
                  }
                  const rect = event.currentTarget.getBoundingClientRect()
                  setHoveredRect(rect)
                  setHoveredElement(value)
                }}
                onMouseLeave={(): void => {
                  scheduleClose()
                }}
              >
                <span className="min-w-0 truncate">{value.name}</span>

                {value.deprecated && (
                  <div
                    className="ml-2 shrink-0 opacity-60 group-hover:opacity-100"
                    onMouseEnter={(event): void => {
                      const rect = event.currentTarget.getBoundingClientRect()
                      setDeprecatedRect(rect)
                      setDeprecatedHovered(value.deprecated!)
                    }}
                    onMouseLeave={(): void => {
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

      {lockedElement || (hoveredRect && hoveredElement) ? (
        <ElementHoverCard
          key={(lockedElement ?? hoveredElement)!.name}
          anchorRect={hoveredRect!}
          element={lockedElement ?? hoveredElement!}
          onUnlock={(): void => {
            setLockedElement(null)
            setHoveredElement(null)
            setHoveredRect(null)
          }}
          onEnter={(): void => {
            cancelClose()
            setLockedElement((previous): ElementDetails | null => previous ?? hoveredElement)
          }}
          onLeave={(): void => {
            setLockedElement(null)
            scheduleClose()
          }}
        />
      ) : null}
    </div>
  )
}
