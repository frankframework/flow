import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useSubmitOnEnter } from '~/hooks/use-submit-on-enter'
import useFlowStore from '~/stores/flow-store'
import useNodeContextStore from '~/stores/node-context-store'
import { useFFDoc } from '@frankframework/doc-library-react'
import Button from '../inputs/button'
import CloseButton from '../inputs/close-button'
import Search from '~/components/search/search'
import type { Elements, FFDocJson } from '@frankframework/doc-library-core'

type CreateNodeModalProperties = {
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

function getElementNamesForType(fullName: string, types: FFDocJson['types'], elements: Elements): Set<string> {
  const fullNames = new Set(types[fullName])
  return new Set(
    Object.entries(elements)
      .filter(([_, element]): boolean => fullNames.has(element.className))
      .map(([name]): string => name),
  )
}

function CreateNodeModal({
  onClose,
  addNodeAtPosition,
  positions,
  sourceInfo,
}: Readonly<CreateNodeModalProperties>): JSX.Element {
  const { elements, ffDoc } = useFFDoc()
  const { setAttributes, setNodeId } = useNodeContextStore((state): NodeContextStore => state)
  const nodes = useFlowStore((state): FlowNode[] => state.nodes)
  const [search, setSearch] = useState('')
  const [selectedElement, setSelectedElement] = useState<string>('')

  const elementArray = useMemo((): ElementDetails[] => {
    if (!elements) return []
    return Object.values(elements).toSorted((a, b): number => a.name.localeCompare(b.name))
  }, [elements])

  const pipeElements = useMemo((): Set<string> => {
    if (!ffDoc || !elements) return new Set<string>()
    return getElementNamesForType('org.frankframework.core.IPipe', ffDoc.types, elements)
  }, [ffDoc, elements])

  const exitElements = useMemo((): Set<string> => {
    if (!ffDoc || !elements) return new Set<string>()
    return getElementNamesForType('org.frankframework.core.PipeLineExit', ffDoc.types, elements)
  }, [ffDoc, elements])

  const allowedElements = useMemo((): Set<string> | null => {
    if (!sourceInfo?.nodeId) return null

    const sourceNode = nodes.find((n): boolean => n.id === sourceInfo.nodeId)
    const subtype =
      sourceNode?.data && 'subtype' in sourceNode.data ? (sourceNode.data as { subtype: string }).subtype : ''

    if (pipeElements.has(subtype)) return new Set([...pipeElements, ...exitElements])

    return pipeElements
  }, [sourceInfo?.nodeId, nodes, pipeElements, exitElements])

  const filteredElements = useMemo((): ElementDetails[] => {
    return elementArray.filter(
      (element): boolean =>
        (!allowedElements || allowedElements.has(element.name)) &&
        element.name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [elementArray, search, allowedElements])

  const handleOnChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newSearch = event.target.value
    setSearch(newSearch)
    const filtered = elementArray
      .filter(
        (element): boolean =>
          (!allowedElements || allowedElements.has(element.name)) &&
          element.name.toLowerCase().includes(newSearch.toLowerCase()),
      )
      .toSorted((a, b): number => a.name.localeCompare(b.name))

    // Automatically select the first match (if any)
    if (filtered.length > 0) {
      setSelectedElement(filtered[0].name)
    } else {
      setSelectedElement('') // No matches → clear selection
    }
  }

  useEffect((): void => {
    setSelectedElement((current): string =>
      current && filteredElements.some((element): boolean => element.name === current)
        ? current
        : (filteredElements[0]?.name ?? ''),
    )
  }, [filteredElements])

  const handleCreateNode = (): void => {
    if (!selectedElement || !positions || !sourceInfo || !elements) return

    const elementData = elements[selectedElement]
    if (!elementData) return

    setAttributes(elementData.attributes)
    setNodeId(+useFlowStore.getState().nodeIdCounter)
    addNodeAtPosition(positions, selectedElement, sourceInfo)
    onClose()
  }

  useSubmitOnEnter(handleCreateNode)

  return (
    <div
      className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[0.5px]"
      onContextMenu={(mouseEvent): void => mouseEvent.stopPropagation()}
    >
      <div className="bg-background border-border relative w-[600px] rounded-lg border p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Add Node</h2>
        <p className="my-4">Select the element to be added from the list below.</p>
        <Search
          autoFocus
          placeholder="Search elements..."
          className="mb-4 px-0"
          value={search}
          onChange={(event): void => handleOnChange(event)}
        />
        <div className="border-border bg-background w-full rounded border">
          <ul className="max-h-[300px] overflow-y-auto">
            {filteredElements.length > 0 ? (
              filteredElements.map((element): JSX.Element => {
                const isSelected = selectedElement === element.name

                return (
                  <li
                    key={element.name}
                    onClick={(): void => setSelectedElement(element.name)}
                    onDoubleClick={handleCreateNode}
                    className={`cursor-pointer px-3 py-2 ${
                      isSelected ? 'bg-foreground-active text-background' : 'hover:bg-hover'
                    }`}
                  >
                    {element.name}
                  </li>
                )
              })
            ) : (
              <li className="text-foreground-muted px-3 py-2">No results found</li>
            )}
          </ul>
        </div>

        <CloseButton onClick={onClose} className="absolute top-3 right-3" />
        <Button disabled={!selectedElement} onClick={handleCreateNode} className="mt-4 w-full">
          Create Node
        </Button>
      </div>
    </div>
  )
}

export default CreateNodeModal
