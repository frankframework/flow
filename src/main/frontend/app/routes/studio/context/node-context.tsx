import useNodeContextStore from '~/stores/node-context-store'
import { useEffect, useState } from 'react'
import useFlowStore, { isFrankNode } from '~/stores/flow-store'
import Button from '~/components/inputs/button'
import HelpIcon from '/icons/solar/Help.svg?react'
import { useShallow } from 'zustand/react/shallow'
import { useJavadocTransform, useFFDoc } from '@frankframework/ff-doc/react'
import variables from '../../../../environment/environment'

export default function NodeContext({
  nodeId,
  setShowNodeContext,
}: Readonly<{
  setShowNodeContext: (b: boolean) => void
  nodeId: number
}>) {
  const { nodes, setAttributes, getAttributes, setNodeName, getNodeName, deleteNode, updateChild, deleteChild } =
    useFlowStore((state) => state)
  const [canSave, setCanSave] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [inputValues, setInputValues] = useState<Record<number, string>>({})

  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { elements } = useFFDoc(FRANK_DOC_URL)
  const { attributes, setIsEditing, parentId, setParentId } = useNodeContextStore(
    useShallow((s) => ({
      attributes: s.attributes,
      setIsEditing: s.setIsEditing,
      parentId: s.parentId,
      setParentId: s.setParentId,
    })),
  )

  const validateForm = () => {
    if (!attributes) {
      setCanSave(true)
      return
    }

    const entries = Object.entries(attributes) // stable ordering
    const allValid = entries.every(([_, attribute]: [string, any], index: number) => {
      if (attribute.mandatory) {
        // use value cache first (works when inputs are unmounted); fallback to ref if present
        const raw = inputValues[index] ?? inputValues[index]
        const value = raw?.toString().trim()
        return !!value
      }
      return true
    })

    setCanSave(allValid)
  }

  // Fills out input fields with already existing attributes when editing a node
  useEffect(() => {
    if (!attributes || Number.isNaN(nodeId)) return

    let currentAttributes: Record<string, string> | undefined

    if (parentId) {
      // Editing a child node → look inside its parent
      const parent = nodes.find((n) => n.id === parentId.toString())
      if (isFrankNode(parent!)) {
        const child = parent.data.children.find((c) => c.id === nodeId.toString())
        if (child) {
          currentAttributes = {
            ...(child.name ? { name: child.name } : {}),
            ...child.attributes,
          }
        }
      }
    } else {
      const attributes = getAttributes(nodeId.toString())
      const name = getNodeName(nodeId.toString())

      currentAttributes = {
        ...(name ? { name } : {}),
        ...attributes,
      }
    }

    if (currentAttributes) {
      const entries = Object.entries(attributes)
      const newValues: Record<number, string> = {}
      for (const [index, [key]] of entries.entries()) {
        newValues[index] = currentAttributes?.[key] ?? ''
      }
      setInputValues(newValues)
    }

    validateForm()
  }, [attributes, nodeId, parentId])

  useEffect(() => {
    if (!attributes) {
      setCanSave(true)
      return
    }
    validateForm()
  }, [attributes])

  // Checks input fields for values and returns only those values and their labels
  function resolveFilledAttributes() {
    if (!attributes) return []

    const entries = Object.entries(attributes) // stable ordering [ [key, attr], ... ]
    const filledAttributes = entries
      .map(([key], index) => {
        // read from value cache first (works whether mounted or not)
        const raw = inputValues[index] ?? inputValues[index]
        const value = raw?.toString().trim()
        if (value) return { name: key, value }
        return null
      })
      .filter(Boolean) as { name: string; value: string }[]

    return filledAttributes
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSave()
    }
  }

  const handleSave = () => {
    const filledAttributes = resolveFilledAttributes()
    const nameField = filledAttributes.find((attribute) => attribute.name === 'name')
    const filteredAttributes = filledAttributes.filter((attribute) => attribute.name !== 'name')
    const newAttributesObject = Object.fromEntries(filteredAttributes.map(({ name, value }) => [name, value]))

    if (parentId) {
      const parentNode = nodes.find((n) => n.id === parentId)
      if (!isFrankNode(parentNode!)) return
      const existingChild = parentNode?.data?.children?.find((c) => c.id === nodeId.toString())

      const childNode = {
        id: nodeId.toString(),
        type: existingChild?.type ?? 'defaultType',
        subtype: existingChild?.subtype ?? 'defaultSubtype',
        ...(nameField && { name: nameField.value }),
        attributes: newAttributesObject,
      }

      updateChild(parentId.toString(), childNode)
      setIsEditing(false)
      setShowNodeContext(false)
      setParentId(null)
      return
    }

    setAttributes(nodeId.toString(), newAttributesObject)
    if (nameField) {
      setNodeName(nodeId.toString(), nameField.value)
    }

    setIsEditing(false)
    setShowNodeContext(false)
  }

  const handleDiscard = () => {
    if (parentId) {
      deleteChild(parentId, nodeId.toString())
      setIsEditing(false)
      setShowNodeContext(false)
      setParentId(null)
      return
    }
    deleteNode(nodeId.toString())
    setIsEditing(false)
    setShowNodeContext(false)
  }

  // Keep original attribute index so refs are stable
  const entriesWithIndex: [string, any, number][] = attributes
    ? Object.entries(attributes).map(([k, v], index) => [k, v, index])
    : []

  const displayedAttributes = entriesWithIndex.filter(([_, attribute]) => showAll || attribute.mandatory)

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-background w-full space-y-4 rounded-md p-6">
          <h1>For node with id: {nodeId}</h1>

          {displayedAttributes.map(([key, attribute, originalIndex]: [string, any, number]) => (
            <div key={originalIndex}>
              <label
                htmlFor={`input-${originalIndex}`}
                className="group font-small text-foreground relative block text-sm"
              >
                {attribute.mandatory && '*'}
                {key}
                {attribute.description && (
                  <DescriptionHelpIcon description={attribute.description} elements={elements} />
                )}
              </label>

              <input
                type="text"
                id={`input-${originalIndex}`}
                name={`input-${originalIndex}`}
                value={inputValues[originalIndex] ?? ''}
                onInput={(event) => {
                  const value = event.currentTarget.value
                  setInputValues((previous) => ({ ...previous, [originalIndex]: value }))
                  validateForm()
                }}
                onKeyDown={handleKeyDown}
                className="border-border focus:border-foreground-active focus:ring-foreground-active mt-1 w-full rounded-md border px-3 py-2 shadow-sm sm:text-sm"
              />
            </div>
          ))}

          <div className="pt-4">
            <Button onClick={() => setShowAll((p) => !p)} className="w-full">
              {showAll ? 'Hide optional attributes' : 'Show all attributes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t-border bg-background flex w-full justify-end gap-4 border-t p-4">
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className={`${canSave ? '' : 'cursor-not-allowed opacity-50'}`}
        >
          Save & Close
        </Button>
        <Button onClick={handleDiscard}>Delete</Button>
      </div>
    </>
  )
}

function DescriptionHelpIcon({
  description,
  elements,
}: Readonly<{ description: string; elements: Record<string, any> | null }>) {
  const [show, setShow] = useState(false)
  const transformed = useJavadocTransform(description, elements)

  return (
    <div className="relative inline-block px-2">
      <button
        type="button"
        onClick={() => setShow((previous) => !previous)}
        className="text-blue-500 hover:text-blue-700 focus:outline-none"
        title="Show help"
      >
        <HelpIcon className="h-auto w-[12px] fill-current" />
      </button>

      {show && (
        <div
          className="bg-background border-border absolute top-0 left-6 z-20 mt-0 w-84 rounded-md border px-3 py-2 text-sm shadow-lg"
          dangerouslySetInnerHTML={transformed}
        />
      )}
    </div>
  )
}
