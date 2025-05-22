import React, { useState } from 'react'
import ArrowDownIcon from 'icons/solar/Alt Arrow Down.svg?react'
import ArrowRightIcon from 'icons/solar/Alt Arrow Right.svg?react'

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
  const [isExpanded, setIsExpanded] = useState(true)

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
        className="flex w-full cursor-pointer items-center gap-1 text-left text-sm font-semibold text-gray-600 capitalize hover:text-gray-900"
      >
        {shouldExpand ? (
          <ArrowDownIcon className="fill-foreground-muted" />
        ) : (
          <ArrowRightIcon className="fill-foreground-muted" />
        )}
        {type === 'other' ? type : `${type}s`}
      </button>

      {shouldExpand && (
        <div className="mt-2 space-y-2">
          {items.map((value) => (
            <li
              className="m-2 cursor-move list-none overflow-hidden rounded border border-gray-400 p-4 overflow-ellipsis"
              key={value.name}
              draggable
              onDragStart={onDragStart(value)}
              style={{
                background: `radial-gradient(
                  ellipse at top left,
                  var(--type-${type}) 0%,
                  white 60%
                )`,
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
