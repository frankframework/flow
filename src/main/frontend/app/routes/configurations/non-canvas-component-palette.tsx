import { useMemo, useState, type ChangeEvent, type DragEvent, type JSX } from 'react'
import { useFFDoc } from '@frankframework/doc-library-react'
import Search from '~/components/search/search'
import LoadingSpinner from '~/components/loading-spinner'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import { getAddableNonCanvasComponentNames } from '~/services/non-canvas-component-service'

/**
 * Palette of non-canvas components that can be dragged onto a configuration tile to add them.
 */
export default function NonCanvasComponentPalette({
  onDragStart,
  onDragEnd,
}: {
  onDragStart?: (tagName: string) => void
  onDragEnd?: () => void
}): JSX.Element {
  const { elements, isLoading } = useFFDoc()
  const { xsdContent } = useFrankConfigXsd()
  const [search, setSearch] = useState('')

  const addableNames = useMemo(
    (): string[] => getAddableNonCanvasComponentNames(xsdContent, elements),
    [xsdContent, elements],
  )

  const filteredNames = useMemo(
    (): string[] => addableNames.filter((name): boolean => name.toLowerCase().includes(search.toLowerCase())),
    [addableNames, search],
  )

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => setSearch(event.target.value)

  const handleDragStart =
    (tagName: string): ((event: DragEvent<HTMLLIElement>) => void) =>
    (event: DragEvent<HTMLLIElement>): void => {
      event.dataTransfer.setData('text/plain', tagName)
      event.dataTransfer.effectAllowed = 'copy'
      onDragStart?.(tagName)
    }

  const handleDragEnd = (): void | undefined => onDragEnd?.()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Search placeholder="Search components..." value={search} onChange={handleSearchChange} />

      {isLoading || !elements || !xsdContent ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner message="Loading components..." />
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto px-3 py-2">
          {filteredNames.length === 0 ? (
            <li className="text-foreground-muted px-1 py-2 text-sm italic">
              {addableNames.length === 0 ? 'No addable components found.' : 'No results found.'}
            </li>
          ) : (
            filteredNames.map((name): JSX.Element => (
              <li
                key={name}
                draggable
                onDragStart={handleDragStart(name)}
                onDragEnd={handleDragEnd}
                style={{ borderLeft: `3px solid var(--type-${getElementTypeFromName(name)})` }}
                className="text-foreground dark:text-foreground-muted hover:text-foreground hover:bg-hover group mb-1 flex cursor-move items-center justify-between rounded-sm py-3 pr-3 pl-3 text-sm"
                title={`Drag "${name}" onto a configuration to add it`}
              >
                <span className="min-w-0 truncate">{name}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
