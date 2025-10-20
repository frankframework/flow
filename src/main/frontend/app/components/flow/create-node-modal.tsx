import { useFFDoc } from '~/hooks/ffdoc/ff-doc-hook'
import variables from '../../../environment/environment'
import type { ElementDetails } from '~/hooks/ffdoc/ff-doc-base'
import { useMemo, useState, type ChangeEvent } from 'react'
import useFlowStore from '~/stores/flow-store'
import useNodeContextStore from '~/stores/node-context-store'

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
  if (!isOpen) return null
  const FRANK_DOC_URL = variables.frankDocJsonUrl

  const { elements } = useFFDoc(FRANK_DOC_URL)
  const { setAttributes, setNodeId } = useNodeContextStore((state) => state)
  const [search, setSearch] = useState('')
  const [selectedElement, setSelectedElement] = useState<string>('')

  // Convert elements (object) into an array for easy iteration

  const elementArray = useMemo(() => {
    if (!elements) return []
    return Object.values(elements).sort((a, b) => a.name.localeCompare(b.name))
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
      .sort((a, b) => a.name.localeCompare(b.name))

    // Automatically select the first match (if any)
    if (filtered.length > 0) {
      setSelectedElement(filtered[0].name)
    } else {
      setSelectedElement('') // No matches → clear selection
    }
  }

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
          className="border-border mb-3 w-full rounded border px-3 py-2 focus:ring focus:ring-blue-200 focus:outline-none"
        />
        <div className="relative">
          <select
            value={selectedElement}
            onChange={(event) => setSelectedElement(event.target.value)}
            className="border-border bg-background w-full rounded border px-3 py-2 focus:ring focus:ring-blue-200 focus:outline-none"
            size={6}
          >
            {filteredElements.length > 0 ? (
              filteredElements.map((element: ElementDetails) => (
                <option key={element.name} value={element.name}>
                  {element.name}
                </option>
              ))
            ) : (
              <option disabled>No results found</option>
            )}
          </select>
        </div>
        <button
          onClick={onClose}
          className="bg-background border-border hover:bg-background absolute top-3 right-3 cursor-pointer rounded border px-3 py-1"
        >
          Close
        </button>
        <button
          onClick={handleCreateNode}
          className="bg-foreground-active/75 hover:bg-foreground-active my-2 cursor-pointer rounded px-3 py-1"
        >
          Create Node
        </button>
      </div>
    </div>
  )
}

export default CreateNodeModal
