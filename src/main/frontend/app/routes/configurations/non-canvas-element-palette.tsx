import { useMemo, useState, type ChangeEvent, type DragEvent } from 'react'
import { useFFDoc } from '@frankframework/doc-library-react'
import Search from '~/components/search/search'
import LoadingSpinner from '~/components/loading-spinner'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import { getAddableNonCanvasElementNames, NON_CANVAS_DRAG_TYPE } from '~/services/non-canvas-element-service'

/**
 * Palette of non-canvas elements that can be dragged onto a configuration tile to add them.
 * Shares the look and drag behaviour of the studio element palette,
 * but is scoped to the elements that are only allowed as direct children of a Configuration/Module.
 */
export default function NonCanvasElementPalette({
  onDragActiveChange,
}: {
  onDragActiveChange?: (active: boolean) => void
}) {
  const { elements, isLoading } = useFFDoc()
  const { xsdContent } = useFrankConfigXsd()
  const [search, setSearch] = useState('')

  const addableNames = useMemo(() => getAddableNonCanvasElementNames(xsdContent, elements), [xsdContent, elements])

  const filteredNames = useMemo(
    () => addableNames.filter((name) => name.toLowerCase().includes(search.toLowerCase())),
    [addableNames, search],
  )

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)

  const handleDragStart = (tagName: string) => (event: DragEvent<HTMLLIElement>) => {
    event.dataTransfer.setData(NON_CANVAS_DRAG_TYPE, tagName)
    event.dataTransfer.effectAllowed = 'copy'
    onDragActiveChange?.(true)
  }

  const handleDragEnd = () => onDragActiveChange?.(false)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Search placeholder="Search elements..." value={search} onChange={handleSearchChange} />

      {isLoading || !elements || !xsdContent ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner message="Loading elements..." />
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto px-3 py-2">
          {filteredNames.length === 0 ? (
            <li className="text-foreground-muted px-1 py-2 text-sm italic">
              {addableNames.length === 0 ? 'No addable elements found.' : 'No results found.'}
            </li>
          ) : (
            filteredNames.map((name) => (
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
