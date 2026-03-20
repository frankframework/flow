import React, { useState } from 'react'
import ArrowDownIcon from 'icons/solar/Alt Arrow Down.svg?react'
import ArrowRightIcon from 'icons/solar/Alt Arrow Right.svg?react'
import { useSettingsStore } from '~/stores/settings-store'
import useNodeContextStore from '~/stores/node-context-store'
import type { ElementDetails } from '@frankframework/doc-library-core'
import { getElementTypeFromName } from '../node-translator-module'
import DangerIcon from '../../../../icons/solar/Danger Triangle.svg?react'
import { DeprecatedListPopover, type DeprecatedInfo } from './deprecated-list-popover'
import ElementHoverCard from './element-hover-card'

interface Properties {
  type: string
  items: ElementDetails[]
  onDragStart: (item: ElementDetails) => React.DragEventHandler<HTMLLIElement>
  searchTerm: string
}

export default function SortedElements({ type, items, onDragStart, searchTerm }: Readonly<Properties>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const gradientEnabled = useSettingsStore((state) => state.studio.gradient)
  const { setDraggedName } = useNodeContextStore((state) => state)
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)
  const [hoveredElement, setHoveredElement] = useState<ElementDetails | null>(null)
  const [deprecatedRect, setDeprecatedRect] = useState<DOMRect | null>(null)
  const [deprecatedHovered, setDeprecatedHovered] = useState<DeprecatedInfo | null>(null)
  const [lockedElement, setLockedElement] = useState<ElementDetails | null>(null)

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded)
  }
  // Autoexpands groups when a search term is entered
  const shouldExpand = searchTerm !== '' || isExpanded

  return (
    <div
      key={type}
      className="mb-4 border-t-2 p-2 shadow-md"
      style={{
        borderColor: `var(--palette-${type.toLowerCase()})`,
      }}
    >
      <button
        onClick={toggleExpansion}
        className="text-foreground-muted hover:text-foreground-active flex w-full cursor-pointer items-center gap-1 text-left text-sm font-semibold capitalize"
      >
        {shouldExpand ? (
          <ArrowDownIcon className="h-4 w-4 fill-current" />
        ) : (
          <ArrowRightIcon className="h-4 w-4 fill-current" />
        )}
        <span className="min-w-0 truncate">{type}</span>
      </button>

      {shouldExpand && (
        <div className="mt-2 space-y-2">
          {items.map((value) => {
            const elementType = getElementTypeFromName(value.name)

            return (
              <li
                key={value.name}
                className="border-border m-2 flex cursor-move items-center justify-between rounded border p-4"
                draggable
                onDragStart={(event) => {
                  setHoveredRect(null)
                  setHoveredElement(null)
                  setLockedElement(null)
                  onDragStart(value)(event)
                }}
                onDragEnd={() => setDraggedName(null)}
                onMouseEnter={(event) => {
                  setLockedElement(null) // unlock previous element
                  const rect = event.currentTarget.getBoundingClientRect()
                  setHoveredRect(rect)
                  setHoveredElement(value)
                }}
                onMouseLeave={() => {
                  if (lockedElement?.name === value.name) return
                  setHoveredElement(null)
                  setHoveredRect(null)
                }}
                style={{
                  background: gradientEnabled
                    ? `radial-gradient(
          ellipse farthest-corner at 20% 20%,
          var(--type-${elementType}) 0%,
          var(--color-background) 100%
        )`
                    : `var(--type-${elementType})`,
                }}
              >
                {/* Left: name */}
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{value.name}</span>

                {/* Right: deprecated icon */}
                {value.deprecated && (
                  <div
                    className="ml-2 flex-shrink-0"
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
        />
      ) : null}
    </div>
  )
}
