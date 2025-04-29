import useNodeContextStore from '~/stores/node-context-store'
import { useEffect, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'

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
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-1 px-4">
        <div className="text-xl">Attributes</div>
        <div className="grow" />
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h1>For node with id: {nodeId}</h1>
          {attributes &&
            attributes.map((attribute: any, index: number) => (
              <div key={index}>
                <label htmlFor={`input-${index}`} className="group font-small relative block text-sm text-gray-700">
                  {attribute.name}
                  {attribute.mandatory && '*'}

                  <span className="absolute top-1/2 left-1/2 z-10 mr-2 hidden w-max max-w-[250px] -translate-y-1/2 rounded bg-gray-950 px-2 py-1 text-sm whitespace-normal text-white shadow-md group-hover:block">
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
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            ))}
          <div className="flex w-full justify-between pr-2">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`mt-4 rounded border border-gray-300 px-3 py-2 shadow-sm sm:text-sm ${
                canSave ? 'hover:cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              Save & Close
            </button>
            <button
              onClick={handleDiscard}
              className="mt-4 ml-2 rounded border border-gray-300 px-3 py-2 shadow-sm hover:cursor-pointer hover:bg-gray-100 sm:text-sm"
            >
              Delete
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
