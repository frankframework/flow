import { useEffect, useState } from 'react'
import Input from '~/components/inputs/input'
import ContextEditorFooter from '~/components/context-editor-footer'
import { deleteAdapter, renameAdapter } from '~/services/adapter-service'

export type AdapterEditorState = {
  configPath: string
  adapterName: string
  adapterPosition: number
}

type AdapterContextProperties = {
  projectName: string
  editor: AdapterEditorState
  onSaved: () => void
  onDeleted: () => void
  onNameChange?: (name: string) => void
}

export default function AdapterContext({
  projectName,
  editor,
  onSaved,
  onDeleted,
  onNameChange,
}: Readonly<AdapterContextProperties>) {
  const [name, setName] = useState(editor.adapterName)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    onNameChange?.(name)
  }, [name, onNameChange])

  const trimmedName = name.trim()
  const canSave = trimmedName !== '' && trimmedName !== editor.adapterName && !isSaving

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)
    setErrorMessage('')
    try {
      await renameAdapter(projectName, editor.adapterName, trimmedName, editor.configPath)
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to rename ${editor.adapterName}`)
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    setErrorMessage('')
    try {
      await deleteAdapter(projectName, editor.adapterName, editor.configPath)
      onDeleted()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to delete ${editor.adapterName}`)
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4">
        <div className="text-foreground-muted mt-2 text-xs font-semibold tracking-wider uppercase">{name}</div>

        <div className="bg-background w-full space-y-4 rounded-md p-6">
          <div className="space-y-1">
            <label htmlFor="adapter-name" className="text-foreground text-sm">
              name
            </label>
            <Input
              id="adapter-name"
              value={name}
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </div>
      </div>

      <ContextEditorFooter
        onSave={handleSave}
        saveDisabled={!canSave}
        saveLabel={isSaving ? 'Saving...' : 'Save & Close'}
        onDelete={handleDelete}
        deleteDisabled={isSaving}
        errorMessage={errorMessage}
      />
    </div>
  )
}
