import { useMemo, useState, type ChangeEvent } from 'react'
import useFlowStore from '~/stores/flow-store'
import useNodeContextStore from '~/stores/node-context-store'
import { useFrankDoc } from '~/providers/frankdoc-provider'
import Button from '../inputs/button'

interface CreateNodeModalProperties {
  isOpen: boolean
  onClose: () => void
  addNodeAtPosition: (
    position: { x: number; y: number },
    elementName: string,
    sourceInfo?: {
      nodeId: string | null
      handleId: string | null
      handleType: 'source' | 'target' | null
    },
  ) => void
  positions: { x: number; y: number } | null
  sourceInfo?: {
    nodeId: string | null
    handleId: string | null
    handleType: 'source' | 'target' | null
  }
}

function CreateNodeModal({
  isOpen,
  onClose,
  addNodeAtPosition,
  positions,
  sourceInfo,
}: Readonly<CreateNodeModalProperties>) {
  const { elements } = useFrankDoc()
  const { setAttributes, setNodeId } = useNodeContextStore((state) => state)
  const [search, setSearch] = useState('')
  const [selectedElement, setSelectedElement] = useState<string>('')

  // Convert elements (object) into an array for easy iteration

  const elementArray = useMemo(() => {
    if (!elements) return []
    return Object.values(elements).toSorted((a, b) => a.name.localeCompare(b.name))
  }, [elements])
  // Filter based on search input

  const filteredElements = useMemo(() => {
    return elementArray.filter((element) => element.name.toLowerCase().includes(search.toLowerCase()))
  }, [elementArray, search])

  const handleOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newSearch = event.target.value
    setSearch(newSearch)
    const filtered = elementArray
      .filter((element) => element.name.toLowerCase().includes(newSearch.toLowerCase()))
      .toSorted((a, b) => a.name.localeCompare(b.name))

    // Automatically select the first match (if any)
    if (filtered.length > 0) {
      setSelectedElement(filtered[0].name)
    } else {
      setSelectedElement('') // No matches → clear selection
    }
  }

  if (!isOpen) return null

  const handleCreateNode = () => {
    if (!selectedElement || !positions || !sourceInfo || !elements) return

    const elementData = elements[selectedElement]
    if (!elementData) return

    setAttributes(elementData.attributes)
    setNodeId(+useFlowStore.getState().nodeIdCounter)
    addNodeAtPosition(positions, selectedElement, sourceInfo)
    onClose()
  }

  return (
    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
      <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Add Node</h2>
        <p className="mb-4">Select the element to be added from the list below.</p>
        <input
          type="text"
          placeholder="Search elements..."
          value={search}
          onChange={(event) => handleOnChange(event)}
          className="border-border focus:ring-foreground-active mb-3 w-full rounded border px-3 py-2 focus:ring focus:outline-none"
        />
        <div className="border-border bg-background mb-2 w-full rounded border">
          <ul className="max-h-[150px] overflow-y-auto">
            {filteredElements.length > 0 ? (
              filteredElements.map((element) => {
                const isSelected = selectedElement === element.name

                return (
                  <li
                    key={element.name}
                    onClick={() => setSelectedElement(element.name)}
                    onDoubleClick={handleCreateNode}
                    className={`cursor-pointer px-3 py-2 ${
                      isSelected ? 'bg-foreground-active text-background' : 'hover:bg-foreground-active/10'
                    }`}
                  >
                    {element.name}
                  </li>
                )
              })
            ) : (
              <li className="text-muted-foreground px-3 py-2">No results found</li>
            )}
          </ul>
        </div>

        <Button onClick={onClose} className="absolute top-3 right-3">
          Close
        </Button>
        <Button onClick={handleCreateNode}>Create Node</Button>
      </div>
    </div>
  )
}

export default CreateNodeModal
