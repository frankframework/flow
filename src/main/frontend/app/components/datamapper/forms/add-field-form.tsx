import { useState, useEffect } from 'react'
import type {
  FormatDefinition,
  FormatState,
  PropertyBasicTypes,
  RuleSet,
  PropertyDefinition,
} from '~/types/datamapper_types/data-types'
import type { CustomNodeData, NodeLabels } from '~/types/datamapper_types/node-types'
import { showWarningToast } from '~/components/toast'
import Input from '~/components/inputs/input'
import Dropdown from '~/components/inputs/dropdown'
import Button from '~/components/inputs/button'

export interface FieldModalProperties {
  fieldType: 'source' | 'target'
  onSave: (data: CustomNodeData) => void
  parents: NodeLabels[]
  formatDefinition: FormatState
  initialData: CustomNodeData | null
}

function AddFieldForm({ fieldType, onSave, parents, formatDefinition, initialData }: FieldModalProperties) {
  const [variableType, setVariableType] = useState(initialData?.variableType || '')
  const [label, setLabel] = useState(initialData?.label || '')
  const [defaultValue, setDefaultValue] = useState(initialData?.defaultValue || '')
  const [parentId, setParent] = useState(initialData?.parentId || `${fieldType}-table`)
  const [defaultValueRules, setDefaultValueRules] = useState<RuleSet>()
  const [defaultValueInputType, setDefaultValueInputType] = useState<PropertyBasicTypes>()
  const [availableTypes, setAvailableTypes] = useState<PropertyDefinition[]>([])

  useEffect(() => {
    const format: FormatDefinition | null = formatDefinition[fieldType]
    if (format) {
      setAvailableTypes(format.properties)
    }
  }, [formatDefinition, fieldType])

  useEffect(() => {
    const format = formatDefinition[fieldType]
    const propertyRules = format?.properties.find((a) => a.name == variableType)
    setDefaultValueRules(propertyRules?.rules)
    setDefaultValueInputType(propertyRules?.type)
  }, [variableType])

  const isFormIncomplete = !variableType || !label

  function handleSave() {
    if (isFormIncomplete) {
      showWarningToast('Please fill in all fields!', 'Invalid input')
      return
    }
    onSave({
      variableType,
      label,
      defaultValue,
      parentId,
      id: initialData?.id || '',
    })
  }

  function validateDefaultValue(value: string) {
    if (defaultValueInputType !== 'number') {
      setDefaultValue(value)
      return
    }

    // Allow numbers starting with -, followed up by any number, followed up by an optional . for decimal values and finally some more numbers
    const numberRegex = /^-?\d*\.?\d*$/

    if (!numberRegex.test(value)) {
      // Invalid character, ignore the input
      return
    }

    // Update the field to allow for futher typing
    setDefaultValue(value)

    // Optional: clean up number if it's a valid number. Check is necessary because else a user can't type 10. when they're in the process of writing decimals
    if (value !== '' && !/^-$/.test(value) && !/\.$/.test(value)) {
      let valueNumber = Number(value)

      if (!Number.isNaN(valueNumber)) {
        if (defaultValueRules?.maxValue !== undefined) {
          valueNumber = Math.min(valueNumber, defaultValueRules.maxValue)
        }
        if (defaultValueRules?.minValue !== undefined) {
          valueNumber = Math.max(valueNumber, defaultValueRules.minValue)
        }
        if (defaultValueRules?.decimalAllowed === false) {
          valueNumber = Math.trunc(valueNumber)
        }

        setDefaultValue(valueNumber.toString())
      }
    }
  }

  return (
    <div className="text-foreground">
      <h1 className="mb-2 text-xl font-bold">
        {initialData ? 'Edit' : 'Add'} {fieldType} property
      </h1>

      {!initialData && (
        <>
          <label htmlFor="parentId">Parent</label>
          <Dropdown
            id="parentId"
            value={parentId}
            onChange={(e) => setParent(e)}
            options={{
              ...Object.fromEntries(parents.map((p) => [p.id, p.label])),
              [`${fieldType}-table`]: `${fieldType}-table`,
            }}
          />
        </>
      )}

      <label htmlFor="variableType">Variable Type:</label>
      <Dropdown
        id="variableType"
        value={variableType}
        onChange={(value) => setVariableType(value)}
        disabled={initialData?.variableType == 'object'}
        options={Object.fromEntries(availableTypes.map((p) => [p.name, p.name]))}
      />

      <label htmlFor="propertyName">Property name:</label>
      <Input name="propertyName" value={label} onChange={(event) => setLabel(event.target.value)} />

      <div hidden={defaultValueInputType == 'object'}>
        <label htmlFor="defaultValue">Default value:</label>
        {defaultValueInputType === 'boolean' ? (
          <Dropdown
            id="defaultValue"
            value={defaultValue}
            onChange={(value: string) => setDefaultValue(value)}
            options={{
              ['']: 'none',
              ['true']: 'true',
              ['false']: 'false',
            }}
          />
        ) : (
          <Input
            name="defaultValue"
            value={defaultValue}
            type="text"
            onChange={(event) => validateDefaultValue(event.target.value)}
          />
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={isFormIncomplete}
        className="border-border hover:bg-hover mt-4 flex w-full flex-col items-center rounded-2xl rounded-md border p-7 px-4 py-2 disabled:opacity-50"
      >
        Save
      </Button>
    </div>
  )
}

export default AddFieldForm
