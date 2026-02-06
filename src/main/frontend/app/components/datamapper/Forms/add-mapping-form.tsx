import React, { type Dispatch, type SetStateAction, useEffect, useState } from 'react'

import AddMutationForm from './add-mutation-form'
import AddConditionForm from './add-conditions-form'
import type { Mutation, Condition, Source } from '~/types/datamapper_types/config-types'
import type { MappingConfig, NodeLabels } from '~/types/datamapper_types/node-types'
import Modal from '../Modal'
import Checkbox from '~/components/inputs/checkbox'
import Dropdown from '~/components/inputs/dropdown'

export interface MappingModalProps {
  onSave: (data: MappingConfig) => void
  sources: NodeLabels[]
  targets: NodeLabels[]
  initialData: MappingConfig | null
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
    ...sources.filter((s) => sourceIds.includes(s.id)),
    ...mutations.map((m) => ({
      id: m.id,
      label: m.name,
      type: m.mutationType?.outputType,
    })),
    ...conditions.map((c) => ({
      id: c.id,
      label: c.name,
      type: 'boolean',
    })),
  ] as Source[]

  const filteredOutputs = React.useMemo(() => {
    if (!targetId) return []
    const outputType = targets.find((t) => t.id === targetId)?.type
    if (!outputType) return []
    return unfilteredOutputs.filter((o) => o.type === outputType)
  }, [targetId, targets, unfilteredOutputs])

  useEffect(() => {
    const outputType = targets.find((t) => t.id === targetId)?.type
    const possibleOutputs = unfilteredOutputs.some((o) => o.id === output && o.type === outputType)
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
      const selectedSources = sources.filter((s) => s.checked).map((s) => s.id)
      const selectedTarget = targets.find((t) => t.checked)?.id ?? ''

      setSourceIds(selectedSources.length > 0 ? selectedSources : [])
      setTargetId(selectedTarget)
    }
  }, [sources, targets, initialData])

  const handleSave = () => {
    onSave({
      id: initialData?.id,
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
              {sourceIds.map((id, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={id}
                    onChange={(e) => updateArrayItem(setSourceIds, idx, e.target.value)}
                    className="bg-background w-full rounded border p-2"
                  >
                    <option value="">Select source</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.type})
                      </option>
                    ))}
                  </select>
                  {/* Updated dropdown: TODO check if styling can be reworked to work properly 
                  <Dropdown
                    id={idx.toString()}
                    value={id}
                    onChange={(e) => updateArrayItem(setSourceIds, idx, e)}
                    // className="bg-background w-full rounded border p-2"
                    options={Object.fromEntries(sources.map((s) => [s.id, `${s.label} (${s.type})`]))}
                  /> */}
                  <button onClick={() => deleteArrayItem(setSourceIds, idx)} className="text-red-500">
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setSourceIds((p) => [...p, ''])} className="mt-1 shrink-0 text-sm text-blue-500">
              + Add another source
            </button>
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-col">
            <label className="shrink-0 font-semibold">Mutations</label>

            <div className={scrollable}>
              {mutations.map((m) => (
                <div key={m.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{m.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditMutation(m)
                          setMutationModal(true)
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setMutations((p) => p.filter((x) => x.id !== m.id))}
                        className="text-red-500"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setMutationModal(true)} className="mt-1 shrink-0 text-sm text-blue-500">
              + Add Mutation
            </button>
          </div>

          <div className="flex min-h-0 flex-col">
            <label className="shrink-0 font-semibold">Conditions</label>

            <div className={scrollable}>
              {conditions.map((c) => (
                <div key={c.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditCondition(c)
                          setConditionModal(true)
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setConditions((p) => p.filter((x) => x.id !== c.id))}
                        className="text-red-500"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setConditionModal(true)} className="mt-1 shrink-0 text-sm text-blue-500">
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
            // className="bg-background w-full rounded border p-2"
            options={Object.fromEntries(filteredOutputs.map((s) => [s.id, `${s.label} (${s.type})`]))}
          />
        </div>

        <div className="flex items-center justify-center pb-2 text-2xl">→</div>

        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-sm font-semibold">Target</label>

          <Dropdown
            value={targetId}
            onChange={setTargetId}
            // className="bg-background w-full rounded border p-2"
            options={Object.fromEntries(targets.map((s) => [s.id, `${s.label} (${s.type})`]))}
          />
        </div>
      </div>

      {/* Conditional Mapping */}
      <div className="mb-4 shrink-0">
        <label className="flex items-center gap-2 font-semibold">
          <Checkbox checked={isConditional} onChange={(e) => setIsConditional(e)} />
          Conditional Mapping
        </label>

        {isConditional && (
          <select
            className="bg-background mt-2 w-full rounded border p-2"
            value={selectedConditional?.id ?? ''}
            onChange={(e) => setSelectedConditional(conditions.find((c) => c.id === e.target.value) ?? null)}
          >
            <option value="" hidden>
              Select a condition
            </option>
            {conditions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isFormIncomplete}
        className="mt-2 w-full shrink-0 rounded-md border py-2 disabled:opacity-50"
      >
        Save
      </button>

      {/* Modals */}
      <Modal isOpen={addMutationModal} onClose={() => setMutationModal(false)}>
        <AddMutationForm
          mutationToEdit={editMutation ?? undefined}
          sources={unfilteredOutputs}
          onSave={(m) => {
            setMutations((p) => (editMutation ? p.map((x) => (x.id === m.id ? m : x)) : [...p, m]))
            setMutationModal(false)
            setEditMutation(null)
          }}
        />
      </Modal>

      <Modal isOpen={addConditionModal} onClose={() => setConditionModal(false)}>
        <AddConditionForm
          sources={unfilteredOutputs}
          conditionToEdit={editCondition ?? undefined}
          onSave={(c) => {
            setConditions((p) => (editCondition ? p.map((x) => (x.id === c.id ? c : x)) : [...p, c]))
            setConditionModal(false)
            setEditCondition(null)
          }}
        />
      </Modal>
    </div>
  )
}

export default AddMappingForm
