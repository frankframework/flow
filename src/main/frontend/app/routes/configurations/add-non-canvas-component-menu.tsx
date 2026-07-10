import { useMemo, useState, type ChangeEvent } from 'react'
import { useFFDoc } from '@frankframework/doc-library-react'
import Button from '~/components/inputs/button'
import Dialog from '~/components/dialog'
import Search from '~/components/search/search'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'
import { getAddableNonCanvasComponentNames } from '~/services/non-canvas-component-service'

type AddNonCanvasComponentMenuProperties = {
  onClose: () => void
  onSelect: (tagName: string) => void
}

export default function AddNonCanvasComponentMenu({
  onClose,
  onSelect,
}: Readonly<AddNonCanvasComponentMenuProperties>) {
  const { elements } = useFFDoc()
  const { xsdContent } = useFrankConfigXsd()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const addableNames = useMemo(() => getAddableNonCanvasComponentNames(xsdContent, elements), [xsdContent, elements])

  const filteredNames = useMemo(
    () => addableNames.filter((name) => name.toLowerCase().includes(search.toLowerCase())),
    [addableNames, search],
  )

  const clearAndClose = () => {
    setSearch('')
    setSelected(null)
    onClose()
  }

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearch(value)
    const filtered = addableNames.find((name) => name.toLowerCase().includes(value.toLowerCase()))
    setSelected(filtered ?? null)
  }

  const handleConfirm = (name?: string) => {
    const tagName = name ?? selected
    if (!tagName) return
    onSelect(tagName)
    clearAndClose()
  }

  return (
    <Dialog onClose={clearAndClose} title="Add non-canvas component" className="flex h-1/2 w-1/3 min-w-100 flex-col">
      <Search placeholder="Search components..." value={search} onChange={handleSearchChange} />
      <div className="border-border bg-background my-3 w-full flex-1 overflow-hidden rounded border">
        <ul className="h-full overflow-y-auto">
          {filteredNames.length > 0 ? (
            filteredNames.map((name) => {
              const isSelected = selected === name
              return (
                <li
                  key={name}
                  onClick={() => setSelected(name)}
                  onDoubleClick={() => handleConfirm(name)}
                  className={`cursor-pointer px-3 py-2 ${
                    isSelected ? 'bg-foreground-active text-background' : 'hover:bg-hover'
                  }`}
                >
                  {name}
                </li>
              )
            })
          ) : (
            <li className="text-foreground-muted px-3 py-2">
              {addableNames.length === 0 ? 'No addable components found.' : 'No results found.'}
            </li>
          )}
        </ul>
      </div>

      <Button onClick={() => handleConfirm()} disabled={!selected} className="w-full">
        Add component
      </Button>
    </Dialog>
  )
}
