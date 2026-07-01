import React, { useMemo, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { useFFDoc } from '@frankframework/doc-library-react'
import Button from '~/components/inputs/button'
import Search from '~/components/search/search'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'
import { getAddableNonCanvasComponentNames } from '~/services/non-canvas-component-service'

type AddNonCanvasComponentMenuProperties = {
  isOpen: boolean
  onClose: () => void
  onSelect: (tagName: string) => void
}

export default function AddNonCanvasComponentMenu({
  isOpen,
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

  if (!isOpen) return null

  const clearAndClose = () => {
    setSearch('')
    setSelected(null)
    onClose()
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) clearAndClose()
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

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={handleBackdropClick}>
      <div className="bg-background border-border relative flex h-1/2 w-1/3 min-w-[400px] flex-col rounded-lg border p-6 shadow-lg">
        <Button
          onClick={clearAndClose}
          className="text-foreground-muted hover:text-foreground absolute top-3 right-3 cursor-pointer text-lg leading-none"
        >
          &times;
        </Button>

        <h2 className="mb-4 text-lg font-bold">Add non-canvas component</h2>

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

        <Button onClick={() => handleConfirm()} disabled={!selected}>
          Add component
        </Button>
      </div>
    </div>,
    document.body,
  )
}
