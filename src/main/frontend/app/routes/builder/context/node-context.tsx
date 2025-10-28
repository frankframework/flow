import useNodeContextStore from '~/stores/node-context-store'
import { useEffect, useRef, useState } from 'react'
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
  const inputReferences = useRef<Record<number, HTMLInputElement | null>>({})
  const { nodes, setAttributes, getAttributes, setNodeName, deleteNode, updateChild, deleteChild } = useFlowStore(
    (state) => state,
  )
  const [canSave, setCanSave] = useState(false)
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
    if (!attributes) return false

    const allValid = Object.entries(attributes).every(([key, attribute]: [string, any], index: number) => {
      if (attribute.mandatory) {
        const value = inputReferences.current[index]?.value?.trim()
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
      // Editing a top-level node → pull from store
      currentAttributes = getAttributes(nodeId.toString())
    }

    if (currentAttributes) {
      // Iterate through attributes as object entries
      const entries = Object.entries(attributes)

      for (const [index, [key, _attribute]] of entries.entries()) {
        const value = currentAttributes?.[key]
        const input = inputReferences.current[index]
        if (input) {
          input.value = value ?? ''
        }
      }
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
    const entries = Object.entries(attributes) // [ [key, value], ... ]

    const filledAttributes = Object.entries(inputReferences.current)
      .map(([indexString, input]) => {
        const index = +indexString
        const value = input?.value?.trim()
        const [key] = entries[index] || []
        if (key && value) {
          return {
            name: key,
            value,
          }
        }
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

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-background w-full space-y-4 rounded-md p-6">
          <h1>For node with id: {nodeId}</h1>
          {attributes &&
            Object.entries(attributes).map(([key, attribute]: [string, any], index: number) => (
              <div key={index}>
                <label htmlFor={`input-${index}`} className="group font-small text-foreground relative block text-sm">
                  {attribute.mandatory && '*'}
                  {key}
                  {attribute.description && (
                    <DescriptionHelpIcon description={attribute.description} elements={elements} />
                  )}
                </label>

                <input
                  type="text"
                  id={`input-${index}`}
                  name={`input-${index}`}
                  ref={(element) => {
                    inputReferences.current[index] = element
                  }}
                  onInput={validateForm}
                  onKeyDown={handleKeyDown}
                  className="border-border mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            ))}
        </div>
      </div>
      <div className="border-t-border bg-background flex w-full justify-end gap-4 border-t p-4">
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className={` ${canSave ? '' : 'cursor-not-allowed opacity-50'}`}
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
  const transformed = useJavadocTransform(
    description,
    elements,
  )

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
