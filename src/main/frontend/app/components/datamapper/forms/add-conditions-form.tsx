import { useId, useState } from 'react'
import Button from '~/components/inputs/button'
import Dropdown from '~/components/inputs/dropdown'
import Input from '~/components/inputs/input'
import type { Source } from '~/types/datamapper_types/export-types'
import type {
  Condition,
  ConditionInput,
  ConditionOperatorConfig,
  ConditionType,
  ConditionTypeConfig,
  ConditionTypeInput,
} from '~/types/datamapper_types/function-types'
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

      <Button onClick={handleSave} disabled={isFormIncomplete} className="w-full">
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
        <Dropdown
          className="mb-4"
          value={selectedIsDefault ? 'defaultValue' : (value?.sourceId ?? '')}
          onChange={(id) =>
            onChange(
              id === 'defaultValue' ? { type: 'defaultValue', value: '' } : { type: 'source', sourceId: id, value: '' },
            )
          }
          options={Object.fromEntries([
            ...(inputConfig.allowDefaultValue ? [['defaultValue', 'Default Value']] : []),
            ...filteredSources.map((source) => [source.id, source.label]),
          ])}
        />

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
        <Dropdown
          value={value?.value ?? ''}
          onChange={(val) => onChange({ type: 'operator', value: val })}
          options={Object.fromEntries(operatorConfig.allowedValues.map((option) => [option, option]))}
        />
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
