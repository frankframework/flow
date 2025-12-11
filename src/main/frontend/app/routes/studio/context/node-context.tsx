import useNodeContextStore from '~/stores/node-context-store'
import { useEffect, useState } from 'react'
import useFlowStore, { isFrankNode } from '~/stores/flow-store'
import Button from '~/components/inputs/button'
import { useShallow } from 'zustand/react/shallow'
import { useFFDoc } from '@frankframework/ff-doc/react'
import variables from '../../../../environment/environment'
import ContextInput from './context-input'

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
  const [errorMessage, setErrorMessage] = useState('')
  const [inputValues, setInputValues] = useState<Record<number, string>>({})

  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { elements, ffDoc } = useFFDoc(FRANK_DOC_URL)
  const { attributes, setIsEditing, parentId, setParentId } = useNodeContextStore(
    useShallow((s) => ({
      attributes: s.attributes,
      setIsEditing: s.setIsEditing,
      parentId: s.parentId,
      setParentId: s.setParentId,
    })),
  )

  const validateForm = (validations = inputValues) => {
    if (!attributes) {
      setCanSave(true)
      return
    }

    const mandatoryValid = validateMandatoryFields(validations)
    const numberValid = validateNumberFields(validations)
    if (!numberValid || !mandatoryValid) {
      setCanSave(false)
      return
    }

    setCanSave(true)
  }

  const validateMandatoryFields = (validations = inputValues) => {
    if (!attributes) return true

    return Object.entries(attributes).every(([_, attribute], index) => {
      if (attribute.mandatory) {
        const raw = validations[index]
        return raw && raw.toString().trim() !== ''
      }
      return true
    })
  }

  const validateNumberFields = (validations = inputValues) => {
    if (!attributes) return true

    return Object.entries(attributes).every(([_, attribute], index) => {
      if (attribute.type === 'int') {
        const raw = validations[index]
        const value = raw?.toString().trim() ?? ''

        // allow empty string
        if (value === '') return true

        // allow digits only
        if (!/^\d+$/.test(value)) {
          setErrorMessage('Please enter valid integer values into numeric fields only')
          return false
        }
        return /^\d+$/.test(value)
      }

      return true
    })
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
  }, [attributes, nodeId, parentId])

  useEffect(() => {
    if (!attributes) {
      setCanSave(true)
      return
    }
    validateForm()
  }, [attributes])

  // Checks form validity on input value changes (And also on first render)
  useEffect(() => {
    validateForm()
  }, [inputValues])

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
              <ContextInput
                id={`ctx-${originalIndex}`}
                value={inputValues[originalIndex] ?? ''}
                onChange={(value: string) => {
                  setInputValues((previous) => {
                    const updated = { ...previous, [originalIndex]: value }
                    validateForm(updated)
                    return updated
                  })
                }}
                onKeyDown={handleKeyDown}
                label={key}
                attribute={attribute}
                enumOptions={attribute.enum ? ffDoc.enums[attribute.enum] : undefined}
                elements={elements ?? undefined}
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

      <div className="border-t-border bg-background border-t p-4">
        {/* Buttons row */}
        <div className="flex w-full items-center justify-between">
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-auto ${canSave ? '' : 'cursor-not-allowed opacity-50'}`}
          >
            Save & Close
          </Button>

          <Button className="w-auto" onClick={handleDiscard}>
            Delete
          </Button>
        </div>

        {/* Error message underneath both buttons */}
        {!canSave && errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
      </div>
    </>
  )
}
