import React, { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'

import AddMutationForm from './add-mutation-form'
import AddConditionForm from './add-conditions-form'
import type { Source } from '~/types/datamapper_types/export-types'
import type { MappingNodeData, NodeLabels } from '~/types/datamapper_types/react-node-types'
import Modal from '~/components/modal'
import Checkbox from '~/components/inputs/checkbox'
import Dropdown from '~/components/inputs/dropdown'
import DeleteButton from '../basic-components/delete-button'
import EditButton from '../basic-components/edit-button'
import Button from '~/components/inputs/button'
import type { Condition, Mutation } from '~/types/datamapper_types/function-types'

export type MappingModalProps = {
  onSave: (data: MappingNodeData) => void
  sources: NodeLabels[]
  targets: NodeLabels[]
  initialData: MappingNodeData | null
}

const updateArrayItem = <T,>(setter: Dispatch<SetStateAction<T[]>>, index: number, value: T): void => {
  setter((previous): T[] => {
    const next = [...previous]
    if (index >= 0 && index < next.length) next[index] = value
    return next
  })
}

const deleteArrayItem = <T,>(setter: Dispatch<SetStateAction<T[]>>, index: number): void => {
  setter((previous): T[] => previous.filter((_, index_): boolean => index_ !== index))
}

function AddMappingForm({ onSave, sources, targets, initialData }: MappingModalProps): React.JSX.Element {
  const [sourceIds, setSourceIds] = useState<string[]>([])
  const [targetId, setTargetId] = useState<string>('')

  const [mutations, setMutations] = useState<Mutation[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])

  const [addMutationModal, setMutationModal] = useState(false)
  const [addConditionModal, setConditionModal] = useState(false)

  const [editMutation, setEditMutation] = useState<Mutation | null>(null)
  const [editCondition, setEditCondition] = useState<Condition | null>(null)

  const [output, setOutput] = useState<string>('')

  const [isConditional, setIsConditional] = useState<boolean>(!!initialData?.conditional)
  const [selectedConditional, setSelectedConditional] = useState<Condition | null>(initialData?.conditional ?? null)

  const unfilteredOutputs: Source[] = useMemo((): Source[] => {
    return [
      ...sources.filter((source): boolean => sourceIds.includes(source.id)),
      ...mutations.map((mutation): { id: string; label: string; type: string | undefined } => ({
        id: mutation.id,
        label: mutation.name,
        type: mutation.mutationType?.outputType,
      })),
      ...conditions.map((condition): { id: string; label: string; type: string } => ({
        id: condition.id,
        label: condition.name,
        type: 'boolean',
      })),
    ] as Source[]
  }, [sources, sourceIds, mutations, conditions])

  const filteredOutputs = React.useMemo((): Source[] => {
    if (!targetId) return []
    const outputType = targets.find((target): boolean => target.id === targetId)?.type
    if (!outputType) return []
    return unfilteredOutputs.filter((output): boolean => output.type === outputType)
  }, [targetId, targets, unfilteredOutputs])

  useEffect((): void => {
    const outputType = targets.find((target): boolean => target.id === targetId)?.type
    const possibleOutputs = unfilteredOutputs.some(
      (possibleOutput): boolean => possibleOutput.id === output && possibleOutput.type === outputType,
    )
    if (!possibleOutputs) {
      setOutput('')
    }

    if (filteredOutputs.length == 1) {
      setOutput(filteredOutputs[0].id)
    }
  }, [targetId, filteredOutputs, unfilteredOutputs, output, targets])

  useEffect((): void => {
    if (initialData) {
      setSourceIds(initialData.sources)
      setTargetId(initialData.target ?? '')
      setMutations(initialData.mutations || [])
      setConditions(initialData.conditions || [])
      setOutput(initialData.output)
    } else {
      const selectedSources = sources
        .filter((source): boolean | undefined => source.checked)
        .map((source): string => source.id)
      const selectedTarget = targets.find((target): boolean | undefined => target.checked)?.id ?? ''

      setSourceIds(selectedSources.length > 0 ? selectedSources : [])
      setTargetId(selectedTarget)
    }
  }, [sources, targets, initialData])

  const handleSave = (): void => {
    onSave({
      id: initialData?.id,
      outputLabel: unfilteredOutputs.find((unfilteredOutput): boolean => unfilteredOutput.id === output)?.label,
      colour: initialData?.colour,
      sources: sourceIds,
      target: targetId,
      type: sourceIds.length > 1 ? 'many-to-one' : 'one-to-one',
      mutations,
      conditions,
      output,
      conditional: isConditional ? selectedConditional : null,
    })
  }

  const isFormIncomplete = sourceIds.some((id): boolean => !id) || !targetId || !output

  const scrollable = 'flex-1 min-h-0 overflow-y-auto space-y-2 max-w-55 truncate'

  return (
    <div className="text-foreground mx-auto flex max-h-[90vh] min-h-0 w-full max-w-225 flex-col">
      <h1 className="mb-4 shrink-0 text-xl font-bold">Add Mapping</h1>

      {/* Main grid with lists */}
      <div className="mb-4 grid min-h-0 grid-cols-2 gap-6">
        {/* Column 1 */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-col">
            <label className="shrink-0 font-semibold">Sources</label>

            <div className={scrollable}>
              {sourceIds.map((id, value): React.JSX.Element => (
                <div key={value} className="flex items-center gap-2">
                  <Dropdown
                    className="max-w-45"
                    id={value.toString()}
                    value={id}
                    onChange={(event): void => updateArrayItem(setSourceIds, value, event)}
                    options={Object.fromEntries(
                      sources.map((source): [string, string] => [source.id, `${source.label} (${source.type})`]),
                    )}
                  />
                  <DeleteButton onClick={(): void => deleteArrayItem(setSourceIds, value)} />
                </div>
              ))}
            </div>

            <button
              onClick={(): void => setSourceIds((id): string[] => [...id, ''])}
              className="text-info mt-1 shrink-0 text-sm"
            >
              + Add another source
            </button>
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-col">
            <label className="shrink-0 font-semibold">Mutations</label>

            <div className={scrollable}>
              {mutations.map((mutation): React.JSX.Element => (
                <div key={mutation.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="max-w-40 truncate font-semibold">{mutation.name}</span>
                    <div className="flex gap-2">
                      <EditButton
                        onClick={(): void => {
                          setEditMutation(mutation)
                          setMutationModal(true)
                        }}
                      />
                      <DeleteButton
                        onClick={(): void =>
                          setMutations((mutations): Mutation[] =>
                            mutations.filter((mutationIterator): boolean => mutationIterator.id !== mutation.id),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={(): void => setMutationModal(true)} className="text-info mt-1 shrink-0 text-sm">
              + Add Mutation
            </button>
          </div>

          <div className="flex min-h-0 flex-col">
            <label className="shrink-0 font-semibold">Conditions</label>

            <div className={scrollable}>
              {conditions.map((condition): React.JSX.Element => (
                <div key={condition.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-semibold">{condition.name}</span>
                    <div className="flex gap-2">
                      <EditButton
                        onClick={(): void => {
                          setEditCondition(condition)
                          setConditionModal(true)
                        }}
                      />
                      <DeleteButton
                        onClick={(): void =>
                          setConditions((conditions): Condition[] =>
                            conditions.filter((conditionToCompare): boolean => conditionToCompare.id !== condition.id),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={(): void => setConditionModal(true)} className="text-info mt-1 shrink-0 text-sm">
              + Add Condition
            </button>
          </div>
        </div>
      </div>

      {/* Target → Output */}
      <div className="mb-4 grid shrink-0 grid-cols-[1fr_auto_1fr] items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-foreground-muted text-sm font-semibold">Output</label>
          <Dropdown
            className="max-w-50"
            value={output}
            onChange={setOutput}
            options={Object.fromEntries(
              filteredOutputs.map((output): [string, string] => [output.id, `${output.label} (${output.type})`]),
            )}
          />
        </div>

        <div className="flex items-center justify-center pb-2 text-2xl">→</div>

        <div className="flex flex-col gap-1">
          <label className="text-foreground-muted text-sm font-semibold">Target</label>

          <Dropdown
            className="max-w-50"
            value={targetId}
            onChange={setTargetId}
            options={Object.fromEntries(
              targets.map((target): [string, string] => [target.id, `${target.label} (${target.type})`]),
            )}
          />
        </div>
      </div>

      {/* Conditional Mapping */}
      <div className="mb-4 shrink-0">
        <label className="flex items-center gap-2 font-semibold">
          <Checkbox checked={isConditional} onChange={(event): void => setIsConditional(event)} />
          Conditional Mapping
        </label>

        {isConditional && (
          <Dropdown
            className="max-w-115 p-2"
            value={selectedConditional?.id ?? ''}
            onChange={(e): void =>
              setSelectedConditional(conditions.find((condition): boolean => condition.id === e) ?? null)
            }
            options={Object.fromEntries(
              conditions.map((condition): [string, string] => [condition.id, condition.name]),
            )}
          />
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={isFormIncomplete}
        className="mt-2 w-full shrink-0 rounded-md border py-2 disabled:opacity-50"
      >
        Save
      </Button>

      {/* Modals */}
      <Modal isOpen={addMutationModal} onClose={(): void => setMutationModal(false)}>
        <AddMutationForm
          mutationToEdit={editMutation ?? undefined}
          sources={unfilteredOutputs}
          onSave={(mutationToEdit): void => {
            setMutations((mutations): Mutation[] =>
              editMutation
                ? mutations.map((mutationToCompare): Mutation =>
                    mutationToCompare.id === mutationToEdit.id ? mutationToEdit : mutationToCompare,
                  )
                : [...mutations, mutationToEdit],
            )
            setMutationModal(false)
            setEditMutation(null)
          }}
        />
      </Modal>

      <Modal isOpen={addConditionModal} onClose={(): void => setConditionModal(false)}>
        <AddConditionForm
          sources={unfilteredOutputs}
          conditionToEdit={editCondition ?? undefined}
          onSave={(conditionToEdit): void => {
            setConditions((conditions): Condition[] =>
              editCondition
                ? conditions.map((conditionToCompare): Condition =>
                    conditionToCompare.id === conditionToEdit.id ? conditionToEdit : conditionToCompare,
                  )
                : [...conditions, conditionToEdit],
            )
            setConditionModal(false)
            setEditCondition(null)
          }}
        />
      </Modal>
    </div>
  )
}

export default AddMappingForm
