import { useId, useState } from 'react'
import Button from '~/components/inputs/button'
import Dropdown from '~/components/inputs/dropdown'
import Input from '~/components/inputs/input'
import type {
  Source,
  Condition,
  ConditionTypeConfig,
  ConditionType,
  ConditionInput,
  ConditionTypeInput,
  ConditionOperatorConfig,
} from '~/types/datamapper_types/config-types'
import conditionConfigJson from '~/utils/datamapper_utils/config/condition-config.json'

interface AddConditionFormProperties {
  sources: Source[]
  onSave: (condition: Condition) => void
  conditionToEdit?: Condition
}

function AddConditionForm({ sources, onSave, conditionToEdit }: Readonly<AddConditionFormProperties>) {
  const newId = `condition-${useId()}`
  const id = conditionToEdit?.id ?? newId
  const conditionsConfig = conditionConfigJson as ConditionTypeConfig
  sources = sources.filter((source) => source.id != id)
  const [condition, setCondition] = useState<Condition>({
    id,
    name: conditionToEdit?.name ?? '',
    type: conditionToEdit?.type ?? null,
    inputs: conditionToEdit?.inputs ?? [],
  })

  const isFormIncomplete = !condition.name || !condition.type

  function handleSave() {
    onSave(condition)
  }

  const selectedConditionConfig = conditionsConfig.conditions.find((c) => c.name === condition.type?.name)

  return (
    <div className="text-foreground border-black">
      <h1 className="mb-2 text-xl font-bold">Add Condition</h1>

      {/* Name input */}
      <div className="mb-4 flex flex-col">
        <label className="mb-1">Condition Name:</label>
        <Input
          type="text"
          value={condition.name}
          onChange={(event) => setCondition((condition) => ({ ...condition, name: event.target.value }))}
          placeholder="Enter a name for this condition"
        />
      </div>

      {/* Condition type selector */}
      <div className="mb-4 flex flex-col">
        <label className="mb-1">Condition type:</label>
        <Dropdown
          value={condition.type?.name ?? ''}
          onChange={(event) => {
            const conditionType = conditionsConfig.conditions.find((condition) => condition.name === event) ?? null
            setCondition({
              id,
              name: condition.name,
              type: conditionType ?? null,
              inputs:
                conditionType?.inputs.map(() => ({
                  type: '',
                  value: '',
                })) ?? [],
            })
          }}
          // className="bg-background w-full rounded border p-2"
          options={Object.fromEntries(conditionsConfig.conditions.map((condition) => [condition.name, condition.name]))}
        />
      </div>

      {selectedConditionConfig && (
        <ConditionDetailsForm
          condition={condition}
          setCondition={setCondition}
          sources={sources}
          conditionConfig={selectedConditionConfig}
        />
      )}

      <Button onClick={handleSave} disabled={isFormIncomplete}>
        Save
      </Button>
    </div>
  )
}

function ConditionDetailsForm({
  condition,
  setCondition,
  sources,
  conditionConfig,
}: Readonly<{
  condition: Condition
  setCondition: React.Dispatch<React.SetStateAction<Condition>>
  sources: Source[]
  conditionConfig: ConditionType
}>) {
  function updateInput(index: number, value: ConditionInput) {
    setCondition((condition) => {
      const newInputs = [...condition.inputs]
      newInputs[index] = value
      return { ...condition, inputs: newInputs }
    })
  }

  return (
    <div className="max-h-[50vh] space-y-2 overflow-auto">
      {conditionConfig.inputs.map((inputConfig, index) => (
        <ConditionInputField
          key={index}
          inputConfig={inputConfig}
          value={condition.inputs[index]}
          onChange={(value) => updateInput(index, value)}
          sources={sources}
        />
      ))}
    </div>
  )
}

function ConditionInputField({
  inputConfig,
  value,
  onChange,
  sources,
}: Readonly<{
  inputConfig: ConditionTypeInput
  value?: ConditionInput
  onChange: (value_: ConditionInput) => void
  sources: Source[]
}>) {
  let filteredSources = sources
  if (inputConfig.inputsAllowed !== 'all') {
    filteredSources = sources.filter((source) => source.type === inputConfig.inputsAllowed)
  }

  if (inputConfig.type === 'source') {
    const selectedIsDefault = value?.type === 'defaultValue'

    return (
      <div className="mb-2 flex flex-col">
        <label className="mb-1">{inputConfig.label}</label>
        <select
          className="bg-background mb-2 w-full rounded border p-2"
          value={selectedIsDefault ? 'defaultValue' : (value?.sourceId ?? '')}
          onChange={(event) => {
            const value_ = event.target.value
            if (value_ === 'defaultValue') {
              onChange({ type: 'defaultValue', value: '' })
            } else {
              onChange({ type: 'source', sourceId: value_, value: '' })
            }
          }}
        >
          <option value="" hidden>
            Select source
          </option>
          {inputConfig.allowDefaultValue && <option value="defaultValue">Default Value</option>}
          {filteredSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>

        {selectedIsDefault && (
          <Input
            type="text"
            placeholder="Enter default value"
            value={value?.value ?? ''}
            onChange={(event) => onChange({ type: 'defaultValue', value: event.target.value })}
          />
        )}
      </div>
    )
  }

  if (inputConfig.type === 'attribute') {
    return (
      <div className="mb-2 flex flex-col">
        <label className="mb-1">{inputConfig.label}</label>
        <Input
          type="text"
          value={value?.value ?? ''}
          onChange={(event) => onChange({ type: 'attribute', value: event.target.value })}
        />
      </div>
    )
  }

  if (inputConfig.type.includes('Operator')) {
    const operatorConfig = (conditionConfigJson as ConditionTypeConfig).operators[
      inputConfig.type
    ] as ConditionOperatorConfig

    if (!operatorConfig) {
      throw new Error(`Operator config not found for ${inputConfig.type}`)
    }

    return (
      <div className="mb-2 flex flex-col">
        <label className="mb-1">{operatorConfig.label}</label>
        <select
          className="bg-background w-full rounded border p-2"
          value={value?.value ?? ''}
          onChange={(event) => onChange({ type: 'operator', value: event.target.value })}
        >
          <option value="" hidden>
            Select operator
          </option>
          {operatorConfig.allowedValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    )
  }

  // fallback
  return (
    <div className="mb-2 flex flex-col">
      <label className="mb-1">{inputConfig.label}</label>
      <Input
        type="text"
        value={value?.value ?? ''}
        onChange={(event) => onChange({ type: 'defaultValue', value: event.target.value })}
      />
    </div>
  )
}

export default AddConditionForm
