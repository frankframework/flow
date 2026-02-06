import { useId, useState } from 'react'
import mutationConfig from '~/utils/datamapper_utils/mutation-config.json'
import type {
  Mutation,
  MutationInput,
  MutationsConfig,
  MutationTypeInput,
  Source,
} from '~/types/datamapper_types/config-types'
import Input from '~/components/inputs/input'

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
    console.log('Saved mutation:', mutation)
    onSave(mutation)
  }

  return (
    <div className="text-foreground border-black">
      <h1 className="mb-2 text-xl font-bold">Add Mutation</h1>

      <label>Mutation name:</label>
      <Input value={mutation.name} onChange={(e) => setMutation((m) => ({ ...m, name: e.target.value }))} />

      <label>Mutation type:</label>
      <select
        className="bg-background mb-4 w-full rounded border p-2"
        value={mutation.mutationType?.name ?? ''}
        onChange={(e) => {
          const mt = mutations.mutations.find((m) => m.name === e.target.value) ?? null
          setMutation({
            id,
            name: mutation.name,
            mutationType: mt,
            inputs: [],
          })
        }}
      >
        <option value="" hidden>
          Select mutation type
        </option>

        {mutations.mutations.map((mt) => (
          <option key={mt.name} value={mt.name}>
            {mt.name}
          </option>
        ))}
      </select>

      {mutation.mutationType && <MutationDetailsForm mutation={mutation} setMutation={setMutation} sources={sources} />}

      <button
        onClick={handleSave}
        disabled={isFormIncomplete}
        className="hover:bg-hover mt-4 w-full rounded-md border py-2 disabled:opacity-50"
      >
        Save
      </button>
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
  function addInputField(mtInput: MutationTypeInput) {
    setMutation((m) => ({
      ...m,
      inputs: [
        ...m.inputs,
        {
          type: mtInput.type === 'source' ? 'source' : 'defaultValue',
          value: '',
        },
      ],
    }))
  }

  function removeInput(index: number) {
    setMutation((m) => ({
      ...m,
      inputs: m.inputs.filter((_, index_) => index_ !== index),
    }))
  }

  return (
    <div className="max-h-[50vh] overflow-auto">
      {mutation.mutationType?.inputs.map((mtInput, index) => {
        return (
          <div key={index} className="space-y-2">
            {/* Base input */}
            <MutationInputField
              mutationInput={mtInput}
              index={index}
              mutation={mutation}
              setMutation={setMutation}
              sources={sources}
            />

            {/* Render extra expandable inputs */}
            {mtInput.expandable &&
              mutation.inputs.slice(index + 1).map((_, extraIndex) => {
                const actualIndex = extraIndex + index + 1
                return (
                  <MutationInputField
                    key={`extra-${actualIndex}`}
                    mutationInput={mtInput}
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
            {mtInput.expandable && (
              <button
                type="button"
                onClick={() => addInputField(mtInput)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                Add input
              </button>
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
    setMutation((m) => {
      const newInputs = [...m.inputs]
      newInputs[index] = { ...newInputs[index], ...updated }
      return { ...m, inputs: newInputs }
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
    const source = sources.find((s) => s.id === sourceId)
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
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            <option value="" hidden>
              Select source
            </option>
            {mutationInput.allowDefaultValue && <option value="defaultValue">defaultValue</option>}
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {(mutationInput.type === 'attribute' || value.type === 'defaultValue') && (
          <input
            className="bg-background w-full rounded-md border px-3 py-2"
            value={value.value ?? ''}
            onChange={(e) =>
              updateInput({
                type: mutationInput.type === 'attribute' ? mutationInput.type : 'defaultValue',
                value: e.target.value,
              })
            }
          />
        )}
      </div>

      {showDelete && (
        <button type="button" onClick={onDelete} className="m-2 text-xl text-red-500">
          &times;
        </button>
      )}
    </div>
  )
}

export default AddMutationForm
