import React, { type Dispatch, type SetStateAction, useEffect, useState } from 'react'

import AddMutationForm from './add-mutation-form'
import AddConditionForm from './add-conditions-form'
import type { , Source } from '~/types/datamapper_types/export-types'
import type { MappingNodeData, NodeLabels } from '~/types/datamapper_types/react-node-types'
import Modal from '~/components/modal'
import Checkbox from '~/components/inputs/checkbox'
import Dropdown from '~/components/inputs/dropdown'
import DeleteButton from '../basic-components/delete-button'
import EditButton from '../basic-components/edit-button'
import Button from '~/components/inputs/button'
import type { Condition, Mutation } from '~/types/datamapper_types/function-types'

export interface MappingModalProps {
  onSave: (data: MappingNodeData) => void
  sources: NodeLabels[]
  targets: NodeLabels[]
  initialData: MappingNodeData | null
}

const updateArrayItem = <T,>(setter: Dispatch<SetStateAction<T[]>>, index: number, value: T) => {
  setter((prev) => {
    const next = [...prev]
    if (index >= 0 && index < next.length) next[index] = value
    return next
  })
}

const deleteArrayItem = <T,>(setter: Dispatch<SetStateAction<T[]>>, index: number) => {
  setter((prev) => prev.filter((_, i) => i !== index))
}

function AddMappingForm({ onSave, sources, targets, initialData }: MappingModalProps) {
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

  const unfilteredOutputs: Source[] = [
    ...sources.filter((source) => sourceIds.includes(source.id)),
    ...mutations.map((mutation) => ({
      id: mutation.id,
      label: mutation.name,
      type: mutation.mutationType?.outputType,
    })),
    ...conditions.map((condition) => ({
      id: condition.id,
      label: condition.name,
      type: 'boolean',
    })),
  ] as Source[]

  const filteredOutputs = React.useMemo(() => {
    if (!targetId) return []
    const outputType = targets.find((target) => target.id === targetId)?.type
    if (!outputType) return []
    return unfilteredOutputs.filter((output) => output.type === outputType)
  }, [targetId, targets, unfilteredOutputs])

  useEffect(() => {
    const outputType = targets.find((target) => target.id === targetId)?.type
    const possibleOutputs = unfilteredOutputs.some(
      (possibleOutput) => possibleOutput.id === output && possibleOutput.type === outputType,
    )
    if (!possibleOutputs) {
      setOutput('')
    }

    if (filteredOutputs.length == 1) {
      setOutput(filteredOutputs[0].id)
    }
  }, [targetId, filteredOutputs, unfilteredOutputs, output, targets])

  useEffect(() => {
    if (initialData) {
      setSourceIds(initialData.sources)
      setTargetId(initialData.target ?? '')
      setMutations(initialData.mutations || [])
      setConditions(initialData.conditions || [])
      setOutput(initialData.output)
    } else {
      const selectedSources = sources.filter((source) => source.checked).map((source) => source.id)
      const selectedTarget = targets.find((target) => target.checked)?.id ?? ''

      setSourceIds(selectedSources.length > 0 ? selectedSources : [])
      setTargetId(selectedTarget)
    }
  }, [sources, targets, initialData])

  const handleSave = () => {
    onSave({
      id: initialData?.id,
      outputLabel: unfilteredOutputs.find((unfilteredOutput) => unfilteredOutput.id === output)?.label,
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

  const isFormIncomplete = sourceIds.some((id) => !id) || !targetId || !output

  const scrollable = 'flex-1 min-h-0 overflow-y-auto space-y-2'

  return (
    <div className="text-foreground mx-auto flex max-h-[90vh] min-h-0 w-full max-w-[900px] flex-col">
      <h1 className="mb-4 shrink-0 text-xl font-bold">Add Mapping</h1>

      {/* Main grid with lists */}
      <div className="mb-4 grid min-h-0 grid-cols-2 gap-6">
        {/* Column 1 */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-col">
            <label className="shrink-0 font-semibold">Sources</label>

            <div className={scrollable}>
              {sourceIds.map((id, value) => (
                <div key={value} className="flex items-center gap-2">
                  <Dropdown
                    id={value.toString()}
                    value={id}
                    onChange={(event) => updateArrayItem(setSourceIds, value, event)}
                    options={Object.fromEntries(
                      sources.map((source) => [source.id, `${source.label} (${source.type})`]),
                    )}
                  />
                  <DeleteButton onClick={() => deleteArrayItem(setSourceIds, value)} />
                </div>
              ))}
            </div>

            <button onClick={() => setSourceIds((id) => [...id, ''])} className="text-info mt-1 shrink-0 text-sm">
              + Add another source
            </button>
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-col">
            <label className="shrink-0 font-semibold">Mutations</label>

            <div className={scrollable}>
              {mutations.map((mutation) => (
                <div key={mutation.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{mutation.name}</span>
                    <div className="flex gap-2">
                      <EditButton
                        onClick={() => {
                          setEditMutation(mutation)
                          setMutationModal(true)
                        }}
                      />
                      <DeleteButton
                        onClick={() =>
                          setMutations((mutations) =>
                            mutations.filter((mutationIterator) => mutationIterator.id !== mutation.id),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setMutationModal(true)} className="text-info mt-1 shrink-0 text-sm">
              + Add Mutation
            </button>
          </div>

          <div className="flex min-h-0 flex-col">
            <label className="shrink-0 font-semibold">Conditions</label>

            <div className={scrollable}>
              {conditions.map((condition) => (
                <div key={condition.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{condition.name}</span>
                    <div className="flex gap-2">
                      <EditButton
                        onClick={() => {
                          setEditCondition(condition)
                          setConditionModal(true)
                        }}
                      />
                      <DeleteButton
                        onClick={() =>
                          setConditions((conditions) =>
                            conditions.filter((conditionToCompare) => conditionToCompare.id !== condition.id),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setConditionModal(true)} className="text-info mt-1 shrink-0 text-sm">
              + Add Condition
            </button>
          </div>
        </div>
      </div>

      {/* Target → Output */}
      <div className="mb-4 grid shrink-0 grid-cols-[1fr_auto_1fr] items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-sm font-semibold">Output</label>
          <Dropdown
            value={output}
            onChange={setOutput}
            options={Object.fromEntries(
              filteredOutputs.map((output) => [output.id, `${output.label} (${output.type})`]),
            )}
          />
        </div>

        <div className="flex items-center justify-center pb-2 text-2xl">→</div>

        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-sm font-semibold">Target</label>

          <Dropdown
            value={targetId}
            onChange={setTargetId}
            options={Object.fromEntries(targets.map((target) => [target.id, `${target.label} (${target.type})`]))}
          />
        </div>
      </div>

      {/* Conditional Mapping */}
      <div className="mb-4 shrink-0">
        <label className="flex items-center gap-2 font-semibold">
          <Checkbox checked={isConditional} onChange={(event) => setIsConditional(event)} />
          Conditional Mapping
        </label>

        {isConditional && (
          <Dropdown
            value={selectedConditional?.id ?? ''}
            onChange={(e) => setSelectedConditional(conditions.find((condition) => condition.id === e) ?? null)}
            options={Object.fromEntries(conditions.map((condition) => [condition.id, condition.name]))}
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
      <Modal isOpen={addMutationModal} onClose={() => setMutationModal(false)}>
        <AddMutationForm
          mutationToEdit={editMutation ?? undefined}
          sources={unfilteredOutputs}
          onSave={(mutationToEdit) => {
            setMutations((mutations) =>
              editMutation
                ? mutations.map((mutationToCompare) =>
                    mutationToCompare.id === mutationToEdit.id ? mutationToEdit : mutationToCompare,
                  )
                : [...mutations, mutationToEdit],
            )
            setMutationModal(false)
            setEditMutation(null)
          }}
        />
      </Modal>

      <Modal isOpen={addConditionModal} onClose={() => setConditionModal(false)}>
        <AddConditionForm
          sources={unfilteredOutputs}
          conditionToEdit={editCondition ?? undefined}
          onSave={(conditionToEdit) => {
            setConditions((conditions) =>
              editCondition
                ? conditions.map((conditionToCompare) =>
                    conditionToCompare.id === conditionToCompare.id ? conditionToCompare : conditionToEdit,
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
