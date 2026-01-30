import useNodeContextStore from '~/stores/node-context-store'
import { useCallback, useEffect, useState } from 'react'
import useFlowStore, { isFrankNode } from '~/stores/flow-store'
import Button from '~/components/inputs/button'
import { useShallow } from 'zustand/react/shallow'
import ContextInput from './context-input'
import { findChildRecursive } from '~/stores/child-utilities'
import { useFrankDoc } from '~/providers/frankdoc-provider'

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

  const { elements, ffDoc } = useFrankDoc()
  const { attributes, setIsEditing, parentId, setParentId, childParentId } = useNodeContextStore(
    useShallow((s) => ({
      attributes: s.attributes,
      setIsEditing: s.setIsEditing,
      parentId: s.parentId,
      setParentId: s.setParentId,
      childParentId: s.childParentId,
    })),
  )

  const validateMandatoryFields = useCallback(
    (validations: Record<number, string>) => {
      if (!attributes) return true

      return Object.entries(attributes).every(([_, attribute], index) => {
        if (attribute.mandatory) {
          const raw = validations[index]
          return raw && raw.toString().trim() !== ''
        }
        return true
      })
    },
    [attributes],
  )

  const validateNumberFields = useCallback(
    (validations: Record<number, string>) => {
      if (!attributes) return true

      return Object.entries(attributes).every(([_, attribute], index) => {
        if (attribute.type === 'int') {
          const raw = validations[index]
          const value = raw?.toString().trim() ?? ''

          if (value === '') return true

          if (!/^\d+$/.test(value)) {
            setErrorMessage('Please enter valid integer values into numeric fields only')
            return false
          }
          return /^\d+$/.test(value)
        }

        return true
      })
    },
    [attributes],
  )

  const validateForm = useCallback(
    (validations = inputValues) => {
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
    },
    [attributes, inputValues, validateMandatoryFields, validateNumberFields],
  )

  const getNestedChildAttributes = useCallback(
    (nodeId: number) => {
      if (!childParentId || !parentId) return
      const parentNode = nodes.find((n) => n.id === parentId.toString())
      if (!parentNode || !isFrankNode(parentNode)) return

      const child = findChildRecursive(parentNode.data.children, nodeId.toString())
      if (!child) return

      return {
        ...(child.name ? { name: child.name } : {}),
        ...child.attributes,
      }
    },
    [childParentId, parentId, nodes],
  )

  const getFirstLevelChildAttributes = useCallback(
    (nodeId: number) => {
      if (!parentId || childParentId) return
      const parentNode = nodes.find((n) => n.id === parentId.toString())
      if (!parentNode || !isFrankNode(parentNode)) return

      const child = parentNode.data.children.find((c) => c.id === nodeId.toString())
      if (!child) return

      return {
        ...(child.name ? { name: child.name } : {}),
        ...child.attributes,
      }
    },
    [parentId, childParentId, nodes],
  )

  const getTopLevelNodeAttributes = useCallback(
    (nodeId: number) => {
      if (parentId || childParentId) return
      const attributes = getAttributes(nodeId.toString())
      const name = getNodeName(nodeId.toString())
      return {
        ...(name ? { name } : {}),
        ...attributes,
      }
    },
    [parentId, childParentId, getAttributes, getNodeName],
  )

  useEffect(() => {
    if (!attributes || Number.isNaN(nodeId)) return

    const currentAttributes =
      getNestedChildAttributes(nodeId) ?? getFirstLevelChildAttributes(nodeId) ?? getTopLevelNodeAttributes(nodeId)

    if (currentAttributes) {
      const entries = Object.entries(attributes)
      const newValues: Record<number, string> = {}
      for (const [index, [key]] of entries.entries()) {
        newValues[index] = (currentAttributes as Record<string, string>)[key] ?? ''
      }
      setInputValues(newValues)
    }
  }, [attributes, nodeId, getNestedChildAttributes, getFirstLevelChildAttributes, getTopLevelNodeAttributes])

  useEffect(() => {
    if (!attributes) {
      setCanSave(true)
      return
    }
    validateForm()
  }, [attributes, validateForm])

  // Checks form validity on input value changes (And also on first render)
  useEffect(() => {
    validateForm()
  }, [inputValues, validateForm])

  // Checks input fields for values and returns only those values and their labels
  function resolveFilledAttributes() {
    if (!attributes) return []

    const entries = Object.entries(attributes) // stable ordering [ [key, attr], ... ]
    return entries
      .map(([key], index) => {
        const raw = inputValues[index] ?? inputValues[index]
        const value = raw?.toString().trim()
        if (value) return { name: key, value }
        return null
      })
      .filter(Boolean) as { name: string; value: string }[]
  }

  const handleSave = () => {
    const filledAttributes = resolveFilledAttributes()
    const nameField = filledAttributes.find((attribute) => attribute.name === 'name')
    const filteredAttributes = filledAttributes.filter((attribute) => attribute.name !== 'name')
    const newAttributesObject = Object.fromEntries(filteredAttributes.map(({ name, value }) => [name, value]))

    // If we're editing a child (the common case)
    if (parentId) {
      const parentNode = nodes.find((n) => n.id === parentId.toString())
      if (!parentNode || !isFrankNode(parentNode)) return

      // 🔍 Find the child recursively
      const existingChild = findChildRecursive(parentNode.data.children, nodeId.toString())

      if (!existingChild) {
        console.error('ERROR: Could not find child to update:', nodeId)
        return
      }

      // ✅ Build updated child (preserves type, subtype, children, etc.)
      const updatedChild = {
        ...existingChild,
        ...(nameField && { name: nameField.value }),
        attributes: newAttributesObject,
      }

      // Update child recursively in store
      updateChild(parentNode.id, updatedChild)

      // Close context
      setIsEditing(false)
      setShowNodeContext(false)
      setParentId(null)
      return
    }

    // Else: updating a top-level Frank node
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
  interface AttributeType {
    mandatory?: boolean
    type?: string
    enum?: string
    description?: string
  }

  const entriesWithIndex: [string, AttributeType, number][] = attributes
    ? Object.entries(attributes).map(([k, v], index) => [k, v as AttributeType, index])
    : []

  const displayedAttributes = entriesWithIndex.filter(([_, attribute]) => showAll || attribute.mandatory)

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-background w-full space-y-4 rounded-md p-6">
          <h1>For node with id: {nodeId}</h1>

          {displayedAttributes.map(([key, attribute, originalIndex]: [string, AttributeType, number]) => (
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
                label={key}
                attribute={attribute}
                enumOptions={
                  attribute.enum && ffDoc?.ffDoc?.enums?.[attribute.enum]
                    ? Object.keys(ffDoc?.ffDoc?.enums[attribute.enum]).reduce(
                        (result, key) => ({ ...result, [key]: key }),
                        {} as Record<string, string>,
                      )
                    : undefined
                }
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
