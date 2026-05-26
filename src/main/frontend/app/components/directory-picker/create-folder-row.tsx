import React, { useState } from 'react'
import FolderIcon from '/icons/solar/Folder.svg?react'
import Button from '~/components/inputs/button'
import Input from '~/components/inputs/input'

interface CreateFolderRowProperties {
  onConfirm: (name: string) => Promise<void>
  onCancel: () => void
}

export default function CreateFolderRow({ onConfirm, onCancel }: Readonly<CreateFolderRowProperties>) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Folder name cannot be empty')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(trimmed)
    } catch {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') void handleSubmit()
    else if (event.key === 'Escape') onCancel()
  }

  return (
    <div className="border-border/60 mx-2 my-1 rounded-md border bg-transparent">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <FolderIcon className="fill-foreground-muted w-4 shrink-0" />
        <Input
          value={name}
          onChange={(changeEvent) => {
            setName(changeEvent.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="New folder name"
          inputClassName="py-0.5 text-sm"
          wrapperClassName="flex-1"
          disabled={submitting}
          autoFocus
        />
        <Button onClick={onCancel} disabled={submitting} className="shrink-0 px-3 py-1 text-xs">
          Cancel
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          disabled={submitting || !name.trim()}
          className="shrink-0 px-3 py-1 text-xs"
        >
          {submitting ? 'Creating…' : 'Create'}
        </Button>
      </div>
      {error && <p className="px-3 pb-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
