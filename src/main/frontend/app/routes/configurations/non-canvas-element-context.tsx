import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFFDoc } from '@frankframework/doc-library-react'
import type { Attribute } from '@frankframework/doc-library-core'
import Button from '~/components/inputs/button'
import ContextInput from '~/routes/studio/context/context-input'
import LoadingSpinner from '~/components/loading-spinner'
import {
  addNonCanvasElement,
  deleteNonCanvasElement,
  updateNonCanvasElement,
  type NonCanvasElement,
} from '~/services/non-canvas-element-service'

export interface NonCanvasEditorState {
  mode: 'add' | 'edit'
  configPath: string
  tagName: string
  index?: number
  initialAttributes?: Record<string, string>
}

interface NonCanvasElementContextProperties {
  projectName: string
  editor: NonCanvasEditorState
  onSaved: (elements: NonCanvasElement[]) => void
  onClose: () => void
  onNameChange?: (name: string) => void
}

const EMPTY_ATTRIBUTE: Attribute = {}

export default function NonCanvasElementContext({
  projectName,
  editor,
  onSaved,
  onClose,
  onNameChange,
}: Readonly<NonCanvasElementContextProperties>) {
  const { elements, ffDoc, isLoading } = useFFDoc()
  const { mode, configPath, tagName, index, initialAttributes } = editor

  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [initiallyFilledKeys, setInitiallyFilledKeys] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const attributeDefinitions = useMemo<Record<string, Attribute>>(
    () => elements?.[tagName]?.attributes ?? {},
    [elements, tagName],
  )

  const fieldKeys = useMemo(() => {
    const keys = new Set<string>(Object.keys(attributeDefinitions))
    for (const key of Object.keys(initialAttributes ?? {})) keys.add(key)
    return [...keys]
  }, [attributeDefinitions, initialAttributes])

  useEffect(() => {
    const values: Record<string, string> = {}
    for (const key of fieldKeys) values[key] = initialAttributes?.[key] ?? ''
    setInputValues(values)
    setInitiallyFilledKeys(
      new Set(
        Object.entries(values)
          .filter(([, value]) => value.trim())
          .map(([key]) => key),
      ),
    )
    setShowAll(false)
    setErrorMessage('')
  }, [fieldKeys, initialAttributes, mode, configPath, tagName, index])

  const canSave = useMemo(() => {
    const mandatoryFilled = fieldKeys.every((key) => {
      if (!attributeDefinitions[key]?.mandatory) return true
      return (inputValues[key] ?? '').trim() !== ''
    })

    const integersValid = fieldKeys.every((key) => {
      if (attributeDefinitions[key]?.type !== 'int') return true
      const value = (inputValues[key] ?? '').trim()
      return value === '' || /^\d+$/.test(value)
    })

    return mandatoryFilled && integersValid
  }, [fieldKeys, attributeDefinitions, inputValues])

  const elementName = inputValues['name']?.trim() ?? ''

  useEffect(() => {
    onNameChange?.(elementName)
  }, [elementName, onNameChange])

  const makeEnumOptions = useCallback(
    (attribute: Attribute) => {
      if (attribute.enum && ffDoc?.enums?.[attribute.enum]) {
        return Object.keys(ffDoc.enums[attribute.enum]).reduce(
          (result, key) => ({ ...result, [key]: key }),
          {} as Record<string, string>,
        )
      }
      return
    },
    [ffDoc],
  )

  const { baseKeys, restKeys } = useMemo(() => {
    const mandatory: string[] = []
    const filled: string[] = []
    const rest: string[] = []
    for (const key of fieldKeys) {
      if (attributeDefinitions[key]?.mandatory) mandatory.push(key)
      else if (initiallyFilledKeys.has(key)) filled.push(key)
      else rest.push(key)
    }

    return { baseKeys: [...mandatory, ...filled], restKeys: rest }
  }, [fieldKeys, attributeDefinitions, initiallyFilledKeys])

  const orderedKeys = showAll ? [...baseKeys, ...restKeys] : baseKeys

  const handleChange = (key: string, value: string) => {
    setInputValues((previous) => ({ ...previous, [key]: value }))
  }

  const resolveFilledAttributes = useCallback(() => {
    const result: Record<string, string> = {}
    for (const key of fieldKeys) {
      const value = (inputValues[key] ?? '').trim()
      if (value) result[key] = value
    }
    return result
  }, [fieldKeys, inputValues])

  const handleSave = async () => {
    if (!canSave || isSaving) return
    setIsSaving(true)
    setErrorMessage('')
    try {
      const attributes = resolveFilledAttributes()
      const pendingSave =
        mode === 'add'
          ? addNonCanvasElement(projectName, configPath, tagName, attributes)
          : updateNonCanvasElement(projectName, configPath, tagName, index ?? 0, attributes)
      const updatedElements = await pendingSave
      onSaved(updatedElements)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to save ${tagName}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    setErrorMessage('')

    try {
      const updatedElements = await deleteNonCanvasElement(projectName, configPath, tagName, index ?? 0)
      onSaved(updatedElements)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to delete ${tagName}`)
      setIsSaving(false)
    }
  }

  if (isLoading || !elements) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message="Loading element..." />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4">
        <div className="text-foreground-muted mt-2 text-xs font-semibold tracking-wider uppercase">{tagName}</div>
        {elementName && <h2 className="mb-2 font-semibold">{elementName}</h2>}

        <div className="bg-background w-full space-y-4 rounded-md p-6">
          {fieldKeys.length === 0 && (
            <p className="text-foreground-muted text-sm italic">This element has no configurable attributes.</p>
          )}

          {orderedKeys.map((key) => (
            <ContextInput
              key={key}
              id={`ncc-${key}`}
              value={inputValues[key] ?? ''}
              onChange={(value: string) => handleChange(key, value)}
              label={key}
              attribute={attributeDefinitions[key] ?? EMPTY_ATTRIBUTE}
              enumOptions={makeEnumOptions(attributeDefinitions[key] ?? EMPTY_ATTRIBUTE)}
              elements={elements ?? null}
            />
          ))}

          {restKeys.length > 0 && (
            <div className="pt-4">
              <Button onClick={() => setShowAll((previous) => !previous)} className="w-full">
                {showAll ? 'Hide empty attributes' : 'Show all attributes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t-border bg-background border-t p-4">
        <div className="flex w-full items-center justify-between">
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="disabled:text-foreground-muted w-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save & Close'}
          </Button>

          <div className="flex items-center gap-2">
            <Button className="w-auto" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            {mode === 'edit' && (
              <Button className="w-auto" variant="destructive" onClick={handleDelete} disabled={isSaving}>
                Delete
              </Button>
            )}
          </div>
        </div>

        {errorMessage && <p className="text-error mt-2 text-sm">{errorMessage}</p>}
      </div>
    </div>
  )
}
