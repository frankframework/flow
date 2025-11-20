import useNodeContextStore from '~/stores/node-context-store'
import useFlowStore from '~/stores/flow-store'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import { useEffect, useState } from 'react'
import SortedElements from '~/routes/studio/context/sorted-elements'
import Search from '~/components/search/search'
import variables from '../../../../environment/environment'
import { useFFDoc } from '@frankframework/ff-doc/react'
import { useProjectStore } from '~/stores/project-store'

export default function StudioContext() {
  const { setAttributes, setNodeId } = useNodeContextStore((state) => state)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const project = useProjectStore((state) => state.project)
  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { filters, elements } = useFFDoc(FRANK_DOC_URL)
  const enabledFilters = project
    ? Object.entries(project.filters)
        .filter(([_, enabled]) => enabled)
        .map(([filterName]) => filterName)
    : []

  useEffect(() => {
    if (!elements) return
    const types = Object.values(elements).map((element: any) => getElementTypeFromName(element.name))
    const initialState: Record<string, boolean> = {}
    for (const type of types) {
      if (!(type in expandedGroups)) {
        initialState[type] = true
      }
    }
    if (Object.keys(initialState).length > 0) {
      setExpandedGroups((previous) => ({ ...previous, ...initialState }))
    }
  })

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

  const shouldShowElement = (elementName: string) => {
    // Show all elements if no filters are applied
    if (!filters || enabledFilters.length === 0) return true
    if (!filters.TYPE || enabledFilters.length === 0) return true

    // Check if element exists in any TYPE category
    const foundInFilters = Object.values(filters).some((categoryGroup) =>
      Object.values(categoryGroup).some((items) => items.includes(elementName)),
    )

    // If the element is not part of any category then its always visible, this would apply for things like Exits, jobs etc.
    if (!foundInFilters) return true

    // Otherwise, only show if its category is enabled
    return Object.values(filters).some((categoryGroup) =>
      Object.entries(categoryGroup).some(
        ([categoryName, items]) => enabledFilters.includes(categoryName) && items.includes(elementName),
      ),
    )
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

  const visibleElements = Object.fromEntries(
    Object.entries(elements || {}).filter(([_, value]) => shouldShowElement(value.name)),
  )

  const groupedElements = elements ? groupElementsByType(visibleElements) : {}

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
          .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
          .map(([type, items]) => (
            <SortedElements key={type} type={type} items={items} onDragStart={onDragStart} searchTerm={searchTerm} />
          ))}
      </ul>
    </div>
  )
}
