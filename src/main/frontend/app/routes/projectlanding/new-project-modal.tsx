import { useState } from 'react'
import { filesystemService } from '~/services/filesystem-service'

interface NewProjectModalProperties {
  isOpen: boolean
  onClose: () => void
  onCreate: (absolutePath: string) => void
}

export default function NewProjectModal({ isOpen, onClose, onCreate }: Readonly<NewProjectModalProperties>) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelectLocation = async () => {
    setError(null)
    try {
      const selection = await filesystemService.selectNativePath()
      if (selection?.path) {
        setLocation(selection.path)
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to open folder picker')
    }
  }

  const handleCreate = () => {
    if (!name.trim() || !location) return

    const separator = location.includes('/') ? '/' : '\\'
    const absolutePath = `${location}${separator}${name.trim()}`
    onCreate(absolutePath)
    setName('')
    setLocation('')
    setError(null)
    onClose()
  }

  const handleClose = () => {
    setName('')
    setLocation('')
    setError(null)
    onClose()
  }

  return (
    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
      <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">New Project</h2>
        <p className="text-foreground-muted mb-4 text-sm">Create a new Frank! project on disk</p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Location</label>
          <div className="flex items-center gap-2">
            <input
              value={location}
              readOnly
              className="border-border bg-backdrop w-full rounded border px-2 py-1 text-sm"
              placeholder="Select a parent directory..."
              aria-label="project location"
            />
            <button
              onClick={handleSelectLocation}
              className="bg-backdrop hover:bg-background border-border rounded border px-3 py-1 text-sm whitespace-nowrap hover:cursor-pointer"
            >
              Browse...
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Project Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="border-border bg-background focus:border-foreground-active focus:ring-foreground-active w-full rounded border px-2 py-1 text-sm transition focus:ring-2 focus:outline-none"
            placeholder="Enter project name"
            aria-label="project name"
          />
        </div>

        {location && name.trim() && (
          <p className="text-foreground-muted mb-4 text-xs">
            Project will be created at: {location}
            {location.includes('/') ? '/' : '\\'}
            {name.trim()}
          </p>
        )}

        {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !location}
            className="bg-backdrop hover:bg-background border-border rounded border px-4 py-2 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Project
          </button>

          <button
            onClick={handleClose}
            className="bg-background border-border hover:bg-backdrop absolute top-3 right-3 cursor-pointer rounded border px-3 py-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
