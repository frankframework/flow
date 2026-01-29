import useNodeContextStore from '~/stores/node-context-store'
import useFlowStore from '~/stores/flow-store'
import { useState } from 'react'
import SortedElements from '~/routes/studio/context/sorted-elements'
import Search from '~/components/search/search'
import { useProjectStore } from '~/stores/project-store'
import type { ElementDetails } from '@frankframework/ff-doc'
import { useFrankDoc } from '~/providers/frankdoc-provider'
import LoadingSpinner from '~/components/loading-spinner'

export default function StudioContext() {
  const { setAttributes, setNodeId, setDraggedName } = useNodeContextStore((state) => state)
  const [searchTerm, setSearchTerm] = useState('')
  const project = useProjectStore((state) => state.project)
  const { filters, elements, isLoading } = useFrankDoc()

  if (isLoading || !elements) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message="Loading palette..." />
      </div>
    )
  }

  const enabledFilters = project
    ? Object.entries(project.filters)
        .filter(([_, enabled]) => enabled)
        .map(([filterName]) => filterName)
    : []

  const componentLookup = filters?.Components
    ? Object.entries(filters.Components).reduce<Record<string, string>>((acc, [type, names]) => {
        for (const name of names) {
          acc[name] = type.toLowerCase()
        }
        return acc
      }, {})
    : {}

  const onDragStart = (value: ElementDetails) => {
    return (event: {
      dataTransfer: { setData: (argument0: string, argument1: string) => void; effectAllowed: string }
    }) => {
      setAttributes(value.attributes)
      setNodeId(+useFlowStore.getState().nodeIdCounter)
      setDraggedName(value.name)
      event.dataTransfer.setData('application/reactflow', JSON.stringify(value))
      event.dataTransfer.effectAllowed = 'copyMove'
    }
  }

  const shouldShowElement = (elementName: string) => {
    if (enabledFilters.length === 0) return true
    if (!filters || !filters.TYPE) return true

    const foundInFilters = Object.values(filters).some((categoryGroup) =>
      Object.values(categoryGroup).some((items) => items.includes(elementName)),
    )

    if (!foundInFilters) return true

    return Object.values(filters).some((categoryGroup) =>
      Object.entries(categoryGroup).some(
        ([categoryName, items]) => enabledFilters.includes(categoryName) && items.includes(elementName),
      ),
    )
  }

  const groupElementsByType = (elementsToGroup: Record<string, ElementDetails>) => {
    const grouped: Record<string, ElementDetails[]> = {}
    const seen = new Set<string>()

    for (const value of Object.values(elementsToGroup)) {
      if (seen.has(value.name)) continue
      seen.add(value.name)

      const type = componentLookup[value.name] ?? 'other'

      if (!grouped[type]) grouped[type] = []
      grouped[type].push(value)
    }

    return grouped
  }

  const visibleElements = Object.fromEntries(
    Object.entries(elements).filter(([_, value]) => shouldShowElement((value as ElementDetails).name)),
  )

  const groupedElements = groupElementsByType(visibleElements as Record<string, ElementDetails>)

  const filteredGroupedElements = Object.entries(groupedElements).reduce(
    (accumulator, [type, items]) => {
      const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      if (filteredItems.length > 0) accumulator[type] = filteredItems
      return accumulator
    },
    {} as Record<string, ElementDetails[]>,
  )

  const elementsToRender = searchTerm ? filteredGroupedElements : groupedElements

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Search
        id="search"
        type="search"
        placeholder="Search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      <ul className="flex-1 overflow-y-auto p-4">
        {Object.keys(elementsToRender).length === 0 && (
          <li className="text-foreground-muted italic">No results found.</li>
        )}
        {Object.entries(elementsToRender)
          .toSorted(([typeA], [typeB]) => typeA.localeCompare(typeB))
          .map(([type, items]) => (
            <SortedElements key={type} type={type} items={items} onDragStart={onDragStart} searchTerm={searchTerm} />
          ))}
      </ul>
    </div>
  )
}
