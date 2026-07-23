import { useId, useMemo, useState } from 'react'
import mutationConfig from '~/utils/datamapper_utils/config/mutation-config.json'
import type { Source } from '~/types/datamapper_types/export-types'
import Input from '~/components/inputs/input'
import Dropdown from '~/components/inputs/dropdown'
import Button from '~/components/inputs/button'
import DeleteButton from '../basic-components/delete-button'
import type {
  Mutation,
  MutationInput,
  MutationsConfig,
  MutationTypeInput,
} from '~/types/datamapper_types/function-types'
import { generateMutationName } from '~/utils/datamapper_utils/function-utils'

function AddMutationForm({
  sources,
  onSave,
  mutationToEdit,
}: {
  sources: Source[]
  onSave: (data: Mutation) => void
  mutationToEdit?: Mutation
}): JSX.Element {
  const newId = `mutation-${useId()}`
  const id = mutationToEdit?.id ?? newId
  const mutations: MutationsConfig = mutationConfig as MutationsConfig
  sources = sources.filter((source): boolean => source.id != id)

  const [mutation, setMutation] = useState<Mutation>({
    id,
    name: mutationToEdit?.name ?? '',
    mutationType: mutationToEdit?.mutationType ?? null,
    inputs: mutationToEdit?.inputs ?? [],
  })

  const isFormIncomplete = !mutation.mutationType || mutation.inputs.length === 0
  const placeholder = useMemo((): string => generateMutationName(mutation), [mutation])

  function handleSave(): void {
    if (!mutation.name) mutation.name = placeholder
    onSave(mutation)
  }

  return (
    <div className="text-foreground max-w-55 border-black">
      <h1 className="mb-2 text-xl font-bold">Add Mutation</h1>

      <label>Mutation name:</label>
      <Input
        value={mutation.name}
        onChange={(event): void =>
          setMutation(
            (
              toSetMutation,
            ): { name: string; id: string; mutationType: MutationType | null; inputs: MutationInput[] } => ({
              ...toSetMutation,
              name: event.target.value,
            }),
          )
        }
        placeholder={placeholder}
      />

      <label>Mutation type:</label>
      <Dropdown
        className="max-w-55"
        value={mutation.mutationType?.name ?? ''}
        onChange={(event): void => {
          const mutationType =
            mutations.mutations.find((mutationToFind): boolean => mutationToFind.name === event) ?? null
          setMutation({
            id,
            name: mutation.name,
            mutationType: mutationType,
            inputs: [],
          })
        }}
        options={Object.fromEntries(
          mutations.mutations.map((mutationToMap): [string, string] => [mutationToMap.name, mutationToMap.name]),
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
}): JSX.Element {
  function addInputField(mutationTypeInput: MutationTypeInput): void {
    setMutation(
      (mutationToSet): { inputs: MutationInput[]; name: string; id: string; mutationType: MutationType | null } => ({
        ...mutationToSet,
        inputs: [
          ...mutationToSet.inputs,
          {
            type: mutationTypeInput.type === 'source' ? 'source' : 'defaultValue',
            value: '',
          },
        ],
      }),
    )
  }

  function removeInput(index: number): void {
    setMutation(
      (mutations): { inputs: MutationInput[]; name: string; id: string; mutationType: MutationType | null } => ({
        ...mutations,
        inputs: mutations.inputs.filter((_, index_): boolean => index_ !== index),
      }),
    )
  }

  return (
    <div className="max-h-[50vh] overflow-auto">
      {mutation.mutationType?.inputs.map((mutationTypeInput, index): JSX.Element => {
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
              mutation.inputs.slice(index + 1).map((_, extraIndex): JSX.Element => {
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
                    onDelete={(): void => removeInput(actualIndex)}
                  />
                )
              })}

            {/* Add input button */}
            {mutationTypeInput.expandable && (
              <Button type="button" onClick={(): void => addInputField(mutationTypeInput)} className="w-full">
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
}): JSX.Element {
  if (mutationInput.inputsAllowed != 'all') {
    sources = sources.filter((source): boolean => source.type == mutationInput.inputsAllowed)
  }
  const value = mutation.inputs[index] ?? {
    type: mutationInput.type,
    value: '',
  }

  function updateInput(updated: MutationInput): void {
    setMutation(
      (mutation): { inputs: MutationInput[]; name: string; id: string; mutationType: MutationType | null } => {
        const newInputs = [...mutation.inputs]
        newInputs[index] = { ...newInputs[index], ...updated }
        return { ...mutation, inputs: newInputs }
      },
    )
  }

  function handleSourceChange(sourceId: string): void {
    if (sourceId === 'defaultValue') {
      updateInput({
        type: mutationInput.type == 'attribute' ? mutationInput.type : 'defaultValue',
        sourceId: 'defaultValue',
        value: '',
      })
      return
    }
    const source = sources.find((source): boolean => source.id === sourceId)
    if (!source) return
    updateInput({ type: 'source', sourceId: source.id, value: source.label })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {mutationInput.label && <label className="mb-1 block">{mutationInput.label}</label>}
        {showDelete && onDelete && <DeleteButton onClick={onDelete} />}
      </div>

      <div>
        {mutationInput.type === 'source' && (
          <Dropdown
            value={value.sourceId ?? ''}
            onChange={handleSourceChange}
            className="mb-4 max-w-55"
            options={Object.fromEntries([
              ...(mutationInput.allowDefaultValue ? [['defaultValue', 'defaultValue']] : []),
              ...sources.map((source): string[] => [source.id, source.label]),
            ])}
          />
        )}

        {(mutationInput.type === 'attribute' || value.type === 'defaultValue') && (
          <Input
            value={value.value ?? ''}
            onChange={(event): void =>
              updateInput({
                type: mutationInput.type === 'attribute' ? mutationInput.type : 'defaultValue',
                value: event.target.value,
              })
            }
          />
        )}
      </div>
    </div>
  )
}

export default AddMutationForm
