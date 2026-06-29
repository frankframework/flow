import { useEffect, useState } from 'react'
import Button from '~/components/inputs/button'
import Input from '~/components/inputs/input'
import { deleteAdapter, renameAdapter } from '~/services/adapter-service'

export interface AdapterEditorState {
  configPath: string
  adapterName: string
  adapterPosition: number
}

interface AdapterContextProperties {
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

      <div className="border-t-border bg-background border-t p-4">
        <div className="flex w-full items-center justify-between">
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="disabled:text-foreground-muted w-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save & Close'}
          </Button>

          <Button className="w-auto" onClick={handleDelete} disabled={isSaving}>
            Delete
          </Button>
        </div>

        {errorMessage && <p className="text-error mt-2 text-sm">{errorMessage}</p>}
      </div>
    </div>
  )
}
