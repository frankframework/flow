import { createPortal } from 'react-dom'
import { useSubmitOnEnter } from '~/hooks/use-submit-on-enter'
import Button from '../inputs/button'
import Search from '~/components/search/search'
import type { ElementDetails } from '@frankframework/doc-library-core'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'

type AddSubcomponentModalProps = {
  onClose: () => void
  possibleChildren: ElementDetails[]
  onAddChild: (element: ElementDetails) => void
}

export default function AddSubcomponentModal({ onClose, possibleChildren, onAddChild }: AddSubcomponentModalProps) {
  const [search, setSearch] = useState('')
  const [selectedElement, setSelectedElement] = useState<ElementDetails | null>(null)

  const filteredChildren = useMemo(() => {
    return possibleChildren
      .filter((child) => child.name.toLowerCase().includes(search.toLowerCase()))
      .toSorted((a, b) => a.name.localeCompare(b.name))
  }, [possibleChildren, search])

  useEffect(() => {
    setSelectedElement((current) =>
      current && filteredChildren.some((child) => child.name === current.name)
        ? current
        : (filteredChildren[0] ?? null),
    )
  }, [filteredChildren])

  const handleClose = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const handleOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newSearch = event.target.value
    setSearch(newSearch)

    const filtered = possibleChildren
      .filter((child) => child.name.toLowerCase().includes(newSearch.toLowerCase()))
      .toSorted((a, b) => a.name.localeCompare(b.name))

    if (filtered.length > 0) {
      setSelectedElement(filtered[0])
    } else {
      setSelectedElement(null)
    }
  }

  const handleAddChild = () => {
    if (!selectedElement) return

    onAddChild(selectedElement)
    onClose()
  }

  useSubmitOnEnter(handleAddChild)

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(mouseEvent) => {
        mouseEvent.stopPropagation()
        handleClose(mouseEvent)
      }}
    >
      <div className="bg-background border-border relative flex h-1/2 w-1/3 min-w-[400px] flex-col rounded-lg border p-6 shadow-lg">
        {/* Close button */}
        <Button
          onClick={onClose}
          className="text-foreground-muted hover:text-foreground absolute top-3 right-3 cursor-pointer text-lg leading-none"
        >
          &times;
        </Button>

        {/* Title */}
        <h2 className="mb-4 text-lg font-bold">Add Subcomponent</h2>

        {/* Paragraph / content */}
        <Search autoFocus placeholder="Search elements..." value={search} onChange={handleOnChange} />
        <div className="border-border bg-background mb-3 w-full flex-1 overflow-hidden rounded border">
          <ul className="h-full overflow-y-auto">
            {filteredChildren.length > 0 ? (
              filteredChildren.map((child) => {
                const isSelected = selectedElement?.name === child.name

                return (
                  <li
                    key={child.name}
                    onClick={() => setSelectedElement(child)}
                    onDoubleClick={handleAddChild}
                    className={`cursor-pointer px-3 py-2 ${
                      isSelected ? 'bg-foreground-active text-background' : 'hover:bg-hover'
                    }`}
                  >
                    {child.name}
                  </li>
                )
              })
            ) : (
              <li className="text-foreground-muted px-3 py-2">No results found</li>
            )}
          </ul>
        </div>
        <Button onClick={handleAddChild} disabled={!selectedElement}>
          Add Subcomponent
        </Button>
      </div>
    </div>,
    document.body,
  )
}
