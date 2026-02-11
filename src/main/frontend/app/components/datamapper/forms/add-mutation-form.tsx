import { useId, useState } from 'react'
import mutationConfig from '~/utils/datamapper_utils/config/mutation-config.json'
import type {
  Mutation,
  MutationInput,
  MutationsConfig,
  MutationTypeInput,
  Source,
} from '~/types/datamapper_types/config-types'
import Input from '~/components/inputs/input'
import Dropdown from '~/components/inputs/dropdown'
import Button from '~/components/inputs/button'

function AddMutationForm({
  sources,
  onSave,
  mutationToEdit,
}: {
  sources: Source[]
  onSave: (data: Mutation) => void
  mutationToEdit?: Mutation
}) {
  const newId = `mutation-${useId()}`
  const id = mutationToEdit?.id ?? newId
  const mutations: MutationsConfig = mutationConfig as MutationsConfig
  sources = sources.filter((source) => source.id != id)

  const [mutation, setMutation] = useState<Mutation>({
    id,
    name: mutationToEdit?.name ?? '',
    mutationType: mutationToEdit?.mutationType ?? null,
    inputs: mutationToEdit?.inputs ?? [],
  })

  const isFormIncomplete = !mutation.name || !mutation.mutationType || mutation.inputs.length === 0

  function handleSave() {
    onSave(mutation)
  }

  return (
    <div className="text-foreground border-black">
      <h1 className="mb-2 text-xl font-bold">Add Mutation</h1>

      <label>Mutation name:</label>
      <Input
        value={mutation.name}
        onChange={(event) => setMutation((toSetMutation) => ({ ...toSetMutation, name: event.target.value }))}
      />

      <label>Mutation type:</label>
      <Dropdown
        value={mutation.mutationType?.name ?? ''}
        onChange={(e) => {
          const mutationType = mutations.mutations.find((mutationToFind) => mutationToFind.name === e) ?? null
          setMutation({
            id,
            name: mutation.name,
            mutationType: mutationType,
            inputs: [],
          })
        }}
        options={Object.fromEntries(
          mutations.mutations.map((mutationToMap) => [mutationToMap.name, mutationToMap.name]),
        )}
      />

      {mutation.mutationType && <MutationDetailsForm mutation={mutation} setMutation={setMutation} sources={sources} />}

      <Button onClick={handleSave} disabled={isFormIncomplete} className="mt-3 w-full">
        Save
      </Button>
    </div>
  )
}

function MutationDetailsForm({
  mutation,
  setMutation,
  sources,
}: {
  mutation: Mutation
  setMutation: React.Dispatch<React.SetStateAction<Mutation>>
  sources: Source[]
}) {
  function addInputField(mutationTypeInput: MutationTypeInput) {
    setMutation((mutationToSet) => ({
      ...mutationToSet,
      inputs: [
        ...mutationToSet.inputs,
        {
          type: mutationTypeInput.type === 'source' ? 'source' : 'defaultValue',
          value: '',
        },
      ],
    }))
  }

  function removeInput(index: number) {
    setMutation((mutations) => ({
      ...mutations,
      inputs: mutations.inputs.filter((_, index_) => index_ !== index),
    }))
  }

  return (
    <div className="max-h-[50vh] overflow-auto">
      {mutation.mutationType?.inputs.map((mutationTypeInput, index) => {
        return (
          <div key={index} className="space-y-2">
            {/* Base input */}
            <MutationInputField
              mutationInput={mutationTypeInput}
              index={index}
              mutation={mutation}
              setMutation={setMutation}
              sources={sources}
            />

            {/* Render extra expandable inputs */}
            {mutationTypeInput.expandable &&
              mutation.inputs.slice(index + 1).map((_, extraIndex) => {
                const actualIndex = extraIndex + index + 1
                return (
                  <MutationInputField
                    key={`extra-${actualIndex}`}
                    mutationInput={mutationTypeInput}
                    index={actualIndex}
                    mutation={mutation}
                    setMutation={setMutation}
                    sources={sources}
                    showDelete
                    onDelete={() => removeInput(actualIndex)}
                  />
                )
              })}

            {/* Add input button */}
            {mutationTypeInput.expandable && (
              <Button type="button" onClick={() => addInputField(mutationTypeInput)} className="w-full">
                Add input
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MutationInputField({
  mutationInput,
  index,
  mutation,
  setMutation,
  sources,
  showDelete = false,
  onDelete,
}: {
  mutationInput: MutationTypeInput
  index: number
  mutation: Mutation
  setMutation: React.Dispatch<React.SetStateAction<Mutation>>
  sources: Source[]
  showDelete?: boolean
  onDelete?: () => void
}) {
  if (mutationInput.inputsAllowed != 'all') {
    sources = sources.filter((source) => source.type == mutationInput.inputsAllowed)
  }
  const value = mutation.inputs[index] ?? {
    type: mutationInput.type,
    value: '',
  }

  function updateInput(updated: MutationInput) {
    setMutation((mutation) => {
      const newInputs = [...mutation.inputs]
      newInputs[index] = { ...newInputs[index], ...updated }
      return { ...mutation, inputs: newInputs }
    })
  }

  function handleSourceChange(sourceId: string) {
    if (sourceId === 'defaultValue') {
      updateInput({
        type: mutationInput.type == 'attribute' ? mutationInput.type : 'defaultValue',
        sourceId: 'defaultValue',
        value: '',
      })
      return
    }
    const source = sources.find((source) => source.id === sourceId)
    if (!source) return
    updateInput({ type: 'source', sourceId: source.id, value: source.label })
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        {mutationInput.label && <label className="mb-1 block">{mutationInput.label}</label>}

        {mutationInput.type === 'source' && (
          <select
            className="bg-background mb-2 w-full rounded border p-2"
            value={value.sourceId ?? ''}
            onChange={(event) => handleSourceChange(event.target.value)}
          >
            <option value="" hidden>
              Select source
            </option>
            {mutationInput.allowDefaultValue && <option value="defaultValue">defaultValue</option>}
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
        )}

        {(mutationInput.type === 'attribute' || value.type === 'defaultValue') && (
          <Input
            value={value.value ?? ''}
            onChange={(event) =>
              updateInput({
                type: mutationInput.type === 'attribute' ? mutationInput.type : 'defaultValue',
                value: event.target.value,
              })
            }
          />
        )}
      </div>

      {showDelete && (
        <button type="button" onClick={onDelete} className="m-2 text-xl text-[var(--color-error)]">
          &times;
        </button>
      )}
    </div>
  )
}

export default AddMutationForm
