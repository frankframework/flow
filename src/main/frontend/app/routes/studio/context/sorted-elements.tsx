import React, { useState } from 'react'
import ArrowDownIcon from 'icons/solar/Alt Arrow Down.svg?react'
import ArrowRightIcon from 'icons/solar/Alt Arrow Right.svg?react'
import { useSettingsStore } from '~/routes/settings/settings-store'
import useNodeContextStore from '~/stores/node-context-store'
import type { ElementDetails } from '@frankframework/ff-doc'
import { getElementTypeFromName } from '../node-translator-module'
import DangerIcon from '../../../../icons/solar/Danger Triangle.svg?react'
import { DeprecatedListPopover } from './deprecated-list-popover'

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
        borderColor: `var(--palette-${type})`,
      }}
    >
      <button
        onClick={toggleExpansion}
        className="text-foreground-muted hover:text-foreground-active flex w-full cursor-pointer items-center gap-1 text-left text-sm font-semibold capitalize"
      >
        {shouldExpand ? <ArrowDownIcon className="fill-current" /> : <ArrowRightIcon className="fill-current" />}
        {type}
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
                onDragStart={onDragStart(value)}
                onDragEnd={() => setDraggedName(null)}
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
                  <div className="group relative ml-2 flex-shrink-0">
                    <DangerIcon />
                    <DeprecatedListPopover deprecated={value.deprecated} />
                  </div>
                )}
              </li>
            )
          })}
        </div>
      )}
    </div>
  )
}
