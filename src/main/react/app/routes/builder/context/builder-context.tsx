import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import useFrankDocStore from '~/stores/frank-doc-store'
import useNodeContextStore from '~/stores/node-context-store'
import useFlowStore from '~/stores/flow-store'
import { getElementTypeFromName } from '~/routes/builder/node-translator-module'

import { useEffect, useState } from 'react'
import SortedElements from '~/routes/builder/context/sorted-elements'

export default function BuilderContext() {
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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="relative px-4 py-2">
        <label htmlFor="search" className="absolute top-1/2 left-6 -translate-y-1/2">
          <MagnifierIcon className="fill-foreground-muted h-auto w-4" />
        </label>
        <input
          id="search"
          className="border-border w-full rounded-full border bg-gray-100 py-1 pr-4 pl-7"
          type="search"
          placeholder="Search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>
      <ul className="flex-1 overflow-y-auto p-4">
        {isLoading && <li>Loading...</li>}
        {error && <li>Error: {error}</li>}
        {!isLoading && Object.keys(elementsToRender).length === 0 && (
          <li className="text-gray-1000 italic">No results found.</li>
        )}
        {!isLoading &&
          Object.entries(elementsToRender)
            .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
            .map(([type, items]) => (
              <SortedElements key={type} type={type} items={items} onDragStart={onDragStart} searchTerm={searchTerm} />
            ))}
      </ul>
    </div>
  )
}
