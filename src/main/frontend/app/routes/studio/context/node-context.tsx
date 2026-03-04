import useNodeContextStore from '~/stores/node-context-store'
import { useCallback, useEffect, useRef, useState } from 'react'
import useFlowStore, { isFrankNode } from '~/stores/flow-store'
import Button from '~/components/inputs/button'
import { useShallow } from 'zustand/react/shallow'
import ContextInput from './context-input'
import { findChildRecursive } from '~/stores/child-utilities'
import { useFFDoc } from '@frankframework/doc-library-react'
import type { Attribute } from '@frankframework/doc-library-core'

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
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [initiallyFilledKeys, setInitiallyFilledKeys] = useState<Set<string>>(new Set())
  const [initialValues, setInitialValues] = useState<Record<string, string>>({})

  const { elements, ffDoc } = useFFDoc()
  const {
    attributes,
    isNewNode,
    setIsEditing,
    setIsNewNode,
    parentId,
    setParentId,
    setChildParentId,
    childParentId,
    setIsDirty,
  } = useNodeContextStore(
    useShallow((s) => ({
      attributes: s.attributes,
      isNewNode: s.isNewNode,
      setIsEditing: s.setIsEditing,
      setIsNewNode: s.setIsNewNode,
      parentId: s.parentId,
      setParentId: s.setParentId,
      setChildParentId: s.setChildParentId,
      childParentId: s.childParentId,
      setIsDirty: s.setIsDirty,
    })),
  )

  const validateMandatoryFields = useCallback(
    (validations: Record<string, string>) => {
      if (!attributes) return true
      return Object.entries(attributes).every(([key, attribute]) => {
        if (attribute.mandatory) {
          const raw = validations[key]
          return raw && raw.toString().trim() !== ''
        }
        return true
      })
    },
    [attributes],
  )

  const validateNumberFields = useCallback(
    (validations: Record<string, string>) => {
      if (!attributes) return true
      return Object.entries(attributes).every(([key, attribute]) => {
        if (attribute.type === 'int') {
          const raw = validations[key]
          const value = raw?.toString().trim() ?? ''
          if (value === '') return true
          if (!/^\d+$/.test(value)) {
            setErrorMessage('Please enter valid integer values into numeric fields only')
            return false
          }
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

  // Load existing attribute values into the form (key-based)
  useEffect(() => {
    if (Number.isNaN(nodeId)) return
    if (!attributes) {
      // Clear stale values so isDirty doesn't carry over from a previous session
      setInputValues({})
      setInitialValues({})
      return
    }

    const currentAttributes =
      getNestedChildAttributes(nodeId) ?? getFirstLevelChildAttributes(nodeId) ?? getTopLevelNodeAttributes(nodeId)

    if (currentAttributes) {
      const newValues: Record<string, string> = {}
      for (const [key] of Object.entries(attributes)) {
        newValues[key] = (currentAttributes as Record<string, string>)[key] ?? ''
      }
      setInputValues(newValues)
      setInitialValues(newValues)

      const filledKeys = new Set<string>()
      for (const [key, value] of Object.entries(newValues)) {
        if (value?.toString().trim()) {
          filledKeys.add(key)
        }
      }
      setInitiallyFilledKeys(filledKeys)
    }
  }, [attributes, nodeId, getNestedChildAttributes, getFirstLevelChildAttributes, getTopLevelNodeAttributes])

  useEffect(() => {
    if (!attributes) {
      setCanSave(true)
      return
    }
    validateForm()
  }, [attributes, validateForm])

  useEffect(() => {
    validateForm()
    const dirty = isNewNode || Object.keys(inputValues).some((k) => inputValues[k] !== initialValues[k])
    setIsDirty(dirty)
  }, [inputValues, validateForm, isNewNode, initialValues, setIsDirty])

  // Returns only filled attribute key/value pairs for saving
  function resolveFilledAttributes() {
    if (!attributes) return []
    return Object.entries(attributes)
      .map(([key]) => {
        const value = (inputValues[key] ?? '').toString().trim()
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

    if (parentId) {
      const parentNode = nodes.find((n) => n.id === parentId.toString())
      if (!parentNode || !isFrankNode(parentNode)) return

      const existingChild = findChildRecursive(parentNode.data.children, nodeId.toString())
      if (!existingChild) {
        console.error('ERROR: Could not find child to update:', nodeId)
        return
      }

      const updatedChild = {
        ...existingChild,
        ...(nameField && { name: nameField.value }),
        attributes: newAttributesObject,
      }

      if (isNewNode) {
        updateChild(parentNode.id, updatedChild, { isNewNode: true })
        setIsNewNode(false)
        setIsEditing(false)
        setShowNodeContext(false)
        setParentId(null)
        setChildParentId(null)
        return
      }
      updateChild(parentNode.id, updatedChild)
      setIsEditing(false)
      setShowNodeContext(false)
      setParentId(null)
      setChildParentId(null)
      return
    }

    if (isNewNode) {
      setAttributes(nodeId.toString(), newAttributesObject, { isNewNode: true })
      if (nameField) {
        setNodeName(nodeId.toString(), nameField.value, { isNewNode: true })
      }
      setIsNewNode(false)
      setIsEditing(false)
      setShowNodeContext(false)
      return
    }
    setAttributes(nodeId.toString(), newAttributesObject)
    if (nameField) {
      setNodeName(nodeId.toString(), nameField.value)
    }
    setIsEditing(false)
    setShowNodeContext(false)
  }

  const canSaveRef = useRef(canSave)
  canSaveRef.current = canSave
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (canSaveRef.current) handleSaveRef.current()
      }
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [])

  const handleDiscard = () => {
    if (parentId) {
      deleteChild(parentId, nodeId.toString())
      setIsEditing(false)
      setShowNodeContext(false)
      setParentId(null)
      setChildParentId(null)
      return
    }
    deleteNode(nodeId.toString())
    setIsEditing(false)
    setIsNewNode(false)
    setShowNodeContext(false)
  }

  // Build sorted attribute list: mandatory first, then initially-filled, then rest
  const entriesWithIndex: [string, Attribute, number][] = attributes
    ? Object.entries(attributes).map(([k, v], index) => [k, v as Attribute, index])
    : []

  const currentName = inputValues['name'] ?? ''

  const categorizedAttributes = (() => {
    if (!attributes) return []

    const mandatory: [string, Attribute, number][] = []
    const filled: [string, Attribute, number][] = []
    const rest: [string, Attribute, number][] = []

    for (const entry of entriesWithIndex) {
      const [key, attribute] = entry
      if (attribute.mandatory) {
        mandatory.push(entry)
      } else if (initiallyFilledKeys.has(key)) {
        filled.push(entry)
      } else {
        rest.push(entry)
      }
    }

    return [...mandatory, ...filled, ...(showAll ? rest : [])]
  })()

  const makeEnumOptions = (attribute: Attribute) => {
    if (attribute.enum && ffDoc?.enums?.[attribute.enum]) {
      return Object.keys(ffDoc.enums[attribute.enum]).reduce(
        (result, key) => ({ ...result, [key]: key }),
        {} as Record<string, string>,
      )
    }
    return
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4">
        {currentName && <h2 className="mb-2 font-semibold">{currentName}</h2>}
        <div className="bg-background w-full space-y-4 rounded-md p-6">
          {categorizedAttributes.map(([key, attribute, originalIndex]) => (
            <div key={originalIndex}>
              <ContextInput
                id={`ctx-${originalIndex}`}
                value={inputValues[key] ?? ''}
                onChange={(value: string) => {
                  setInputValues((previous) => {
                    const updated = { ...previous, [key]: value }
                    validateForm(updated)
                    return updated
                  })
                }}
                label={key}
                attribute={attribute}
                enumOptions={makeEnumOptions(attribute)}
                elements={elements ?? undefined}
              />
            </div>
          ))}

          <div className="pt-4">
            <Button onClick={() => setShowAll((p) => !p)} className="w-full">
              {showAll ? 'Hide empty attributes' : 'Show all attributes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t-border bg-background border-t p-4">
        <div className="flex w-full items-center justify-between">
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="disabled:text-foreground-muted w-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save & Close
          </Button>

          <Button className="w-auto" onClick={handleDiscard}>
            Delete
          </Button>
        </div>

        {!canSave && errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
      </div>
    </>
  )
}
