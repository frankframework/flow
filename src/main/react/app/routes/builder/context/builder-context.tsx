import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import useFrankDocStore from '~/stores/frank-doc-store'
import useNodeContextStore from '~/stores/node-context-store'
import useFlowStore from '~/stores/flow-store'
import { getElementTypeFromName } from '~/routes/builder/node-translator-module'

import { useEffect, useState } from 'react'

export default function BuilderContext({ onClose }: Readonly<{ onClose: () => void }>) {
  const { frankDocRaw, isLoading, error } = useFrankDocStore()
  const { setAttributes, setNodeId } = useNodeContextStore((state) => state)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!frankDocRaw?.elements) return
    const types = Object.values(frankDocRaw.elements).map((element: any) => getElementTypeFromName(element.name))
    const initialState: Record<string, boolean> = {}
    for (const type of types) {
      if (!(type in expandedGroups)) {
        initialState[type] = true
      }
    }
    if (Object.keys(initialState).length > 0) {
      setExpandedGroups((previous) => ({ ...previous, ...initialState }))
    }
  }, [frankDocRaw])

  const toggleGroup = (type: string) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [type]: !previous[type],
    }))
  }

  const onDragStart = (value: { attributes: any[] }) => {
    return (event: {
      dataTransfer: { setData: (argument0: string, argument1: string) => void; effectAllowed: string }
    }) => {
      setAttributes(value.attributes)
      setNodeId(+useFlowStore.getState().nodeIdCounter)
      event.dataTransfer.setData('application/reactflow', JSON.stringify(value))
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  const groupElementsByType = (elements: Record<string, any>) => {
    const grouped: Record<string, any[]> = {}
    const seen = new Set<string>()

    for (const [, value] of Object.entries(elements)) {
      if (seen.has(value.name)) continue // Skip duplicates by name
      seen.add(value.name)

      const type = getElementTypeFromName(value.name)
      if (!grouped[type]) grouped[type] = []
      grouped[type].push(value)
    }
    return grouped
  }

  const groupedElements = frankDocRaw?.elements ? groupElementsByType(frankDocRaw.elements) : {}

  const filteredGroupedElements = Object.entries(groupedElements).reduce(
    (accumulator, [type, items]) => {
      const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      if (filteredItems.length > 0) accumulator[type] = filteredItems
      return accumulator
    },
    {} as Record<string, any[]>,
  )

  const elementsToRender = searchTerm ? filteredGroupedElements : groupedElements

  return (
    <div className="h-full">
      <div>
        <div className="flex h-12 items-center gap-1 px-4">
          <div className="text-xl">Palette</div>
          <div className="grow"></div>
          <SidebarIcon onClick={onClose} className="fill-gray-950 hover:fill-[var(--color-brand)]" />
        </div>
        <div className="relative px-4">
          <label htmlFor="search" className="absolute top-1/2 left-6 -translate-y-1/2">
            <MagnifierIcon className="h-auto w-4 fill-gray-400" />
          </label>
          <input
            id="search"
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-1 pr-4 pl-7"
            type="search"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="h-full overflow-y-auto">
        <ul className="p-4">
          {isLoading && <li>Loading...</li>}
          {error && <li>Error: {error}</li>}
          {!isLoading && Object.keys(elementsToRender).length === 0 && (
            <li className="text-gray-500 italic">No results found.</li>
          )}
          {!isLoading &&
            Object.entries(elementsToRender)
              .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
              .map(([type, items]) => {
                const isExpanded = searchTerm ? true : (expandedGroups[type] ?? true)
                return (
                  <div
                    key={type}
                    className="mb-4 border-t-2 p-2 shadow-md"
                    style={{
                      borderColor: `var(--type-${type}`,
                    }}
                  >
                    <button
                      onClick={() => toggleGroup(type)}
                      className="w-full cursor-pointer text-left text-sm font-semibold text-gray-600 capitalize hover:text-gray-900"
                    >
                      {isExpanded ? '▾' : '▸'} {type === 'other' ? type : `${type}s`}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {items.map((value) => (
                          <li
                            className="m-2 cursor-move list-none rounded border border-gray-400 p-4"
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
              })}
        </ul>
      </div>
    </div>
  )
}
