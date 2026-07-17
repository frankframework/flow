import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFFDoc } from '@frankframework/doc-library-react'
import {
  flattenInheritedParentElementProperties,
  getInheritedProperties,
  type Attribute,
} from '@frankframework/doc-library-core'
import Button from '~/components/inputs/button'
import ContextInput from '~/routes/studio/context/context-input'
import ContextEditorFooter from '~/components/context-editor-footer'
import LoadingSpinner from '~/components/loading-spinner'
import {
  addNonCanvasComponent,
  deleteNonCanvasComponent,
  updateNonCanvasComponent,
  type NonCanvasComponent,
} from '~/services/non-canvas-component-service'

export type NonCanvasComponentEditorState = {
  mode: 'add' | 'edit'
  configPath: string
  tagName: string
  index?: number
  initialAttributes?: Record<string, string>
}

type NonCanvasComponentContextProperties = {
  projectName: string
  editor: NonCanvasComponentEditorState
  onSaved: (components: NonCanvasComponent[]) => void
  onClose: () => void
  onNameChange?: (name: string) => void
}

const EMPTY_ATTRIBUTE: Attribute = {}

export default function NonCanvasComponentContext({
  projectName,
  editor,
  onSaved,
  onClose,
  onNameChange,
}: Readonly<NonCanvasComponentContextProperties>): JSX.Element {
  const { elements, ffDoc, isLoading } = useFFDoc()
  const { mode, configPath, tagName, index, initialAttributes } = editor

  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [initiallyFilledKeys, setInitiallyFilledKeys] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const attributeDefinitions = useMemo<Record<string, Attribute>>((): Record<string, Attribute> => {
    const element = elements?.[tagName]
    if (!element) return {}

    const directAttributes = element.attributes ?? {}
    if (!ffDoc) return directAttributes

    const inherited = getInheritedProperties(element, ffDoc.elements, ffDoc.enums)
    return {
      ...flattenInheritedParentElementProperties(inherited.attributesOptional),
      ...flattenInheritedParentElementProperties(inherited.attributesRequired),
      ...directAttributes,
    }
  }, [elements, ffDoc, tagName])

  const fieldKeys = useMemo((): string[] => {
    const keys = new Set<string>(Object.keys(attributeDefinitions))
    for (const key of Object.keys(initialAttributes ?? {})) keys.add(key)
    return [...keys]
  }, [attributeDefinitions, initialAttributes])

  useEffect((): void => {
    const values: Record<string, string> = {}
    for (const key of fieldKeys) values[key] = initialAttributes?.[key] ?? ''
    setInputValues(values)
    setInitiallyFilledKeys(
      new Set(
        Object.entries(values)
          .filter(([, value]): string => value.trim())
          .map(([key]): string => key),
      ),
    )
    setShowAll(false)
    setErrorMessage('')
  }, [fieldKeys, initialAttributes, mode, configPath, tagName, index])

  const canSave = useMemo((): boolean => {
    const mandatoryFilled = fieldKeys.every((key): boolean => {
      if (!attributeDefinitions[key]?.mandatory) return true
      return (inputValues[key] ?? '').trim() !== ''
    })

    const integersValid = fieldKeys.every((key): boolean => {
      if (attributeDefinitions[key]?.type !== 'int') return true
      const value = (inputValues[key] ?? '').trim()
      return value === '' || /^\d+$/.test(value)
    })

    return mandatoryFilled && integersValid
  }, [fieldKeys, attributeDefinitions, inputValues])

  const componentName = inputValues['name']?.trim() ?? ''

  useEffect((): void => {
    onNameChange?.(componentName)
  }, [componentName, onNameChange])

  const makeEnumOptions = useCallback(
    (attribute: Attribute): Record<string, string> | undefined => {
      if (attribute.enum && ffDoc?.enums?.[attribute.enum]) {
        return Object.keys(ffDoc.enums[attribute.enum]).reduce(
          (result, key): Record<string, string> => ({ ...result, [key]: key }),
          {} as Record<string, string>,
        )
      }
      return
    },
    [ffDoc],
  )

  const { baseKeys, restKeys } = useMemo((): { baseKeys: string[]; restKeys: string[] } => {
    const mandatory: string[] = []
    const filled: string[] = []
    const rest: string[] = []
    for (const key of fieldKeys) {
      if (key === 'name') continue
      if (attributeDefinitions[key]?.mandatory) mandatory.push(key)
      else if (initiallyFilledKeys.has(key)) filled.push(key)
      else rest.push(key)
    }

    const leading = fieldKeys.includes('name') ? ['name'] : []
    return { baseKeys: [...leading, ...mandatory, ...filled], restKeys: rest }
  }, [fieldKeys, attributeDefinitions, initiallyFilledKeys])

  const orderedKeys = showAll ? [...baseKeys, ...restKeys] : baseKeys

  const handleChange = (key: string, value: string): void => {
    setInputValues((previous): Record<string, string> => ({ ...previous, [key]: value }))
  }

  const resolveFilledAttributes = useCallback((): Record<string, string> => {
    const result: Record<string, string> = {}
    for (const key of fieldKeys) {
      const value = (inputValues[key] ?? '').trim()
      if (value) result[key] = value
    }
    return result
  }, [fieldKeys, inputValues])

  const handleSave = async (): Promise<void> => {
    if (!canSave || isSaving) return
    setIsSaving(true)
    setErrorMessage('')
    try {
      const attributes = resolveFilledAttributes()
      const pendingSave =
        mode === 'add'
          ? addNonCanvasComponent(projectName, configPath, tagName, attributes)
          : updateNonCanvasComponent(projectName, configPath, tagName, index ?? 0, attributes)
      const updatedComponents = await pendingSave
      onSaved(updatedComponents)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to save ${tagName}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    setIsSaving(true)
    setErrorMessage('')

    try {
      const updatedComponents = await deleteNonCanvasComponent(projectName, configPath, tagName, index ?? 0)
      onSaved(updatedComponents)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to delete ${tagName}`)
      setIsSaving(false)
    }
  }

  if (isLoading || !elements) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message="Loading component..." />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4">
        <div className="text-foreground-muted mt-2 text-xs font-semibold tracking-wider uppercase">{componentName}</div>

        <div className="bg-background w-full space-y-4 rounded-md p-6">
          {fieldKeys.length === 0 && (
            <p className="text-foreground-muted text-sm italic">This component has no configurable attributes.</p>
          )}

          {orderedKeys.map((key): JSX.Element => (
            <ContextInput
              key={key}
              id={`ncc-${key}`}
              value={inputValues[key] ?? ''}
              onChange={(value: string): void => handleChange(key, value)}
              label={key}
              attribute={attributeDefinitions[key] ?? EMPTY_ATTRIBUTE}
              enumOptions={makeEnumOptions(attributeDefinitions[key] ?? EMPTY_ATTRIBUTE)}
              elements={elements ?? null}
            />
          ))}

          {restKeys.length > 0 && (
            <div className="pt-4">
              <Button onClick={(): void => setShowAll((previous): boolean => !previous)} className="w-full">
                {showAll ? 'Hide empty attributes' : 'Show all attributes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <ContextEditorFooter
        onSave={handleSave}
        saveDisabled={!canSave || isSaving}
        saveLabel={isSaving ? 'Saving...' : 'Save & Close'}
        onDelete={mode === 'edit' ? handleDelete : onClose}
        deleteDisabled={isSaving}
        errorMessage={errorMessage}
      />
    </div>
  )
}
