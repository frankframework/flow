import React, { useState } from 'react'
import ArrowDownIcon from 'icons/solar/Alt Arrow Down.svg?react'
import ArrowRightIcon from 'icons/solar/Alt Arrow Right.svg?react'
import { useSettingsStore } from '~/routes/settings/settings-store'
import useNodeContextStore from '~/stores/node-context-store'

interface Item {
  name: string
  attributes: any[]
}

interface Properties {
  type: string
  items: Item[]
  onDragStart: (item: Item) => React.DragEventHandler<HTMLLIElement>
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
        borderColor: `var(--type-${type})`,
      }}
    >
      <button
        onClick={toggleExpansion}
        className="text-foreground-muted hover:text-foreground-active flex w-full cursor-pointer items-center gap-1 text-left text-sm font-semibold capitalize"
      >
        {shouldExpand ? <ArrowDownIcon className="fill-current" /> : <ArrowRightIcon className="fill-current" />}
        {type === 'other' ? type : `${type}s`}
      </button>

      {shouldExpand && (
        <div className="mt-2 space-y-2">
          {items.map((value) => (
            <li
              className="border-border m-2 cursor-move list-none overflow-hidden rounded border p-4 overflow-ellipsis"
              key={value.name}
              draggable
              onDragStart={onDragStart(value)}
              onDragEnd={() => setDraggedName(null)}
              style={{
                background: gradientEnabled
                  ? `radial-gradient(
                    ellipse farthest-corner at 20% 20%,
                    var(--type-${type}) 0%,
                    var(--color-background) 100%
                  )`
                  : `var(--type-${type})`,
              }}
            >
              {value.name}
            </li>
          ))}
        </div>
      )}
    </div>
  )
}
