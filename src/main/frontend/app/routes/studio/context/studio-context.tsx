import useNodeContextStore from '~/stores/node-context-store'
import { useEffect, useState, useMemo } from 'react'
import SortedElements from '~/routes/studio/context/sorted-elements'
import Search from '~/components/search/search'
import { useProjectStore } from '~/stores/project-store'
import type { ElementDetails } from '@frankframework/doc-library-core'
import { useFFDoc } from '@frankframework/doc-library-react'
import LoadingSpinner from '~/components/loading-spinner'
import LoadError from '~/components/load-error'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'
import { getChildrenForType, getFirstLevelElementsForType } from '~/utils/xsd-utils'
import { DEFAULT_ELEMENTS, NON_CANVAS_ELEMENTS } from './palette-config'

const ROOT_TYPES = ['PipelineType', 'ReceiverType']
const PALETTE_LOAD_TIMEOUT_MS = 15_000

export default function StudioContext(): JSX.Element {
  const { setDraggedName, setAllowedOnCanvas } = useNodeContextStore((state): NodeContextStore => state)
  const [searchTerm, setSearchTerm] = useState('')
  const project = useProjectStore((state): ConfigurationProject | undefined => state.project)
  const { filters, elements, isLoading, error: ffDocumentError, refetch: refetchFDocument } = useFFDoc()
  const { xsdDoc, error: xsdError, refetch: refetchXsd } = useFrankConfigXsd()

  const { allowed, elementsAllowedOnCanvas } = useMemo(():
    { allowed: null; elementsAllowedOnCanvas: never[] } | { allowed: string[]; elementsAllowedOnCanvas: string[] } => {
    if (!xsdDoc) return { allowed: null, elementsAllowedOnCanvas: [] }

    const all: string[] = []
    for (const type of ROOT_TYPES) {
      all.push(...getChildrenForType(xsdDoc, type))
    }

    return {
      allowed: [...new Set(all)],
      elementsAllowedOnCanvas: [...DEFAULT_ELEMENTS, ...getFirstLevelElementsForType(xsdDoc, 'PipelineType')],
    }
  }, [xsdDoc])

  const isReady = !isLoading && !!elements && allowed !== null
  const hasError = ffDocumentError !== null || xsdError !== null

  const [timedOut, setTimedOut] = useState(false)

  useEffect((): (() => void) | undefined => {
    if (isReady || hasError) return

    const timer = setTimeout((): void => setTimedOut(true), PALETTE_LOAD_TIMEOUT_MS)
    return (): void => clearTimeout(timer)
  }, [isReady, hasError])

  const retry = (): void => {
    setTimedOut(false)
    refetchFDocument()
    refetchXsd()
  }

  if (!isReady) {
    if (hasError || timedOut) {
      return (
        <div className="flex h-full items-center justify-center">
          <LoadError message={"Couldn't load the palette.\nCheck your connection and try again."} onRetry={retry} />
        </div>
      )
    }

    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message="Loading palette..." />
      </div>
    )
  }

  const enabledFilters = project
    ? Object.entries(project.filters)
        .filter(([_, enabled]): boolean => enabled)
        .map(([filterName]): string => filterName)
    : []

  const componentLookup = filters?.Components
    ? Object.entries(filters.Components).reduce<Record<string, string>>(
        (accumulator, [type, names]): Record<string, string> => {
          for (const name of names) {
            accumulator[name] = type
          }
          return accumulator
        },
        {},
      )
    : {}

  const onDragStart = (
    value: ElementDetails,
  ): ((event: {
    dataTransfer: { setData: (argument0: string, argument1: string) => void; effectAllowed: string }
  }) => void) => {
    return (event: {
      dataTransfer: {
        setData: (argument0: string, argument1: string) => void
        effectAllowed: string
      }
    }): void => {
      const isAllowedOnCanvas = elementsAllowedOnCanvas.includes(value.name)

      setDraggedName(value.name)
      setAllowedOnCanvas(isAllowedOnCanvas)
      event.dataTransfer.setData('application/reactflow', JSON.stringify(value))
      event.dataTransfer.effectAllowed = 'copyMove'
    }
  }

  const shouldShowElement = (elementName: string): boolean => {
    if (enabledFilters.length === 0) return true
    if (!filters || !filters.TYPE) return true

    const foundInFilters = Object.values(filters).some((categoryGroup): boolean =>
      Object.values(categoryGroup).some((items): boolean => items.includes(elementName)),
    )

    if (!foundInFilters) return true

    return Object.values(filters).some((categoryGroup): boolean =>
      Object.entries(categoryGroup).some(
        ([categoryName, items]): boolean => enabledFilters.includes(categoryName) && items.includes(elementName),
      ),
    )
  }

  const groupElementsByType = (elementsToGroup: Record<string, ElementDetails>): Record<string, ElementDetails[]> => {
    const grouped: Record<string, ElementDetails[]> = {}
    const seen = new Set<string>()

    for (const value of Object.values(elementsToGroup)) {
      if (seen.has(value.name)) continue

      const type = componentLookup[value.name]

      if (!type) continue

      seen.add(value.name)

      if (!grouped[type]) grouped[type] = []
      grouped[type].push(value)
    }

    return grouped
  }

  const visibleElements = Object.fromEntries(
    Object.entries(elements).filter(([_, value]): boolean => {
      const name = (value as ElementDetails).name

      // Always remove non-canvas elements.
      if (NON_CANVAS_ELEMENTS.includes(name)) {
        return false
      }
      // Always show elements present in the default components list.
      if (DEFAULT_ELEMENTS.includes(name)) {
        return true
      }

      return allowed.includes(name) && shouldShowElement(name)
    }),
  )

  const groupedElements = groupElementsByType(visibleElements as Record<string, ElementDetails>)

  const filteredGroupedElements = Object.entries(groupedElements).reduce(
    (accumulator, [type, items]): Record<string, ElementDetails[]> => {
      const filteredItems = items.filter((item): boolean => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
        onChange={(event): void => setSearchTerm(event.target.value)}
      />
      <ul className="flex-1 overflow-y-auto px-3 py-2">
        {Object.keys(elementsToRender).length === 0 && (
          <li className="text-foreground-muted italic">No results found.</li>
        )}
        {Object.entries(elementsToRender)
          .toSorted(([typeA], [typeB]): number => typeA.localeCompare(typeB))
          .map(([type, items]): JSX.Element => (
            <SortedElements key={type} type={type} items={items} onDragStart={onDragStart} searchTerm={searchTerm} />
          ))}
      </ul>
    </div>
  )
}
