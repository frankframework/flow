import useNodeContextStore from '~/stores/node-context-store'
import { useEffect, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import Button from '~/components/inputs/button'
import ValidatedInput from '~/components/inputs/validatedInput'

export default function NodeContext({
  nodeId,
  setShowNodeContext,
}: Readonly<{
  setShowNodeContext: (b: boolean) => void
  nodeId: number
}>) {
  const attributes = useNodeContextStore((state) => state.attributes)
  const inputReferences = useRef<Record<number, HTMLInputElement | null>>({})
  const { setAttributes, getAttributes, setNodeName, deleteNode } = useFlowStore((state) => state)
  const [canSave, setCanSave] = useState(false)

  const validateForm = () => {
    if (!attributes) return false
    const allValid = attributes.every((attribute: any, index: number) => {
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
    const currentAttributes = getAttributes(nodeId.toString())
    if (currentAttributes && attributes) {
      for (const [index, attribute] of attributes.entries()) {
        const value = currentAttributes[attribute.name]
        const currentInputReferance = inputReferences.current[index]
        if (value && currentInputReferance) {
          currentInputReferance.value = value
        }
      }
    }
    validateForm()
  }, [attributes, getAttributes, nodeId])

  useEffect(() => {
    if (!attributes) {
      setCanSave(true)
      return
    }
    validateForm()
  }, [attributes])

  // Checks input fields for values and returns only those values and their labels
  function resolveFilledAttributes() {
    const filledAttributes = Object.entries(inputReferences.current)
      .map(([indexString, input]) => {
        const index = +indexString
        const value = input?.value?.trim()
        if (value) {
          return {
            name: attributes[index]?.name,
            value,
          }
        }
        return null
      })
      .filter(Boolean) as { name: string; value: string }[]
    return filledAttributes
  }

  const handleSave = () => {
    const filledAttributes = resolveFilledAttributes()
    const nameField = filledAttributes.find((attribute) => attribute.name === 'name')
    const filteredAttributes = filledAttributes.filter((attribute) => attribute.name !== 'name')
    const newAttributesObject = Object.fromEntries(filteredAttributes.map(({ name, value }) => [name, value]))

    setAttributes(nodeId.toString(), newAttributesObject)
    if (nameField) {
      setNodeName(nodeId.toString(), nameField.value)
    }

    setShowNodeContext(false)
  }

  const handleDiscard = () => {
    deleteNode(nodeId.toString())
    setShowNodeContext(false)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-background w-full space-y-4 rounded-md p-6">
          <h1>For node with id: {nodeId}</h1>
          {attributes &&
            attributes.map((attribute: any, index: number) => (
              <div key={index}>
                <label htmlFor={`input-${index}`} className="group font-small text-foreground relative block text-sm">
                  {attribute.name}
                  {attribute.mandatory && '*'}
                  <span className="absolute top-full left-0 z-10 mt-1 hidden w-full max-w-xs rounded bg-gray-950 px-2 py-1 text-sm break-words text-white shadow-md group-hover:block">
                    {attribute.description}
                  </span>
                </label>

                <input
                  type="text"
                  id={`input-${index}`}
                  name={`input-${index}`}
                  ref={(element) => {
                    inputReferences.current[index] = element
                  }}
                  onInput={validateForm}
                  className="border-border mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {/*{JSON.stringify(attribute)}*/}
                {/*<ValidatedInput*/}
                {/*  placeholder={attribute.default || ''}*/}
                {/*  type="text"*/}
                {/*  id={`input-${index}-2`}*/}
                {/*  name={`input-${index}`}*/}
                {/*  ref={(element) => {*/}
                {/*    inputReferences.current[index] = element*/}
                {/*  }}*/}
                {/*  pattern={attribute.mandatory && ({'No empty': /.+/})}*/}
                {/*  onInput={validateForm}*/}
                {/*/>*/}
              </div>
            ))}
        </div>
      </div>
        <div className="flex w-full justify-end border-t-border gap-4 bg-background border-t p-4">
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
