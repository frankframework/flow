import { useState, useEffect } from 'react'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import { filesystemService } from '~/services/filesystem-service'

interface NewProjectModalProperties {
  isOpen: boolean
  isLocal: boolean // <--- NIEUW
  onClose: () => void
  onCreate: (pathOrName: string) => void
}

export default function NewProjectModal({ isOpen, isLocal, onClose, onCreate }: Readonly<NewProjectModalProperties>) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  // Load default path when modal opens
  useEffect(() => {
    if (isOpen && isLocal) {
      filesystemService
        .getDefaultPath()
        .then(setLocation)
        .catch(() => setLocation(''))
    } else if (isOpen) {
      setLocation('')
    }
  }, [isOpen, isLocal])

  if (!isOpen) return null

  const handleCreate = () => {
    if (!name.trim()) return
    if (isLocal && !location) return

    if (isLocal) {
      const separator = location.includes('/') ? '/' : '\\'
      const absolutePath = `${location}${separator}${name.trim()}`
      onCreate(absolutePath)
    } else {
      // Cloud: combineer optionele subfolder met naam
      const trimmedName = name.trim()
      const path = location ? `${location}/${trimmedName}` : trimmedName
      onCreate(path)
    }

    handleClose()
  }

  const handleClose = () => {
    setName('')
    setLocation('')
    setShowPicker(false)
    onClose()
  }

  return (
    <>
      <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
        <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">New Project</h2>
          <p className="text-foreground-muted mb-4 text-sm">
            {isLocal ? 'Create a new Frank! project on disk' : 'Create a new project in the workspace'}
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Location</label>
            <div className="flex items-center gap-2">
              <input
                value={location || (isLocal ? '' : 'Workspace root')}
                readOnly
                className="border-border bg-backdrop w-full rounded border px-2 py-1 text-sm"
                placeholder={isLocal ? 'Select a parent directory...' : 'Workspace root (or browse for subfolder)'}
              />

              <button
                onClick={() => setShowPicker(true)}
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
            />
          </div>

          {name.trim() && (
            <p className="text-foreground-muted mb-4 text-xs">
              Project will be created at:{' '}
              {isLocal
                ? `${location}${location.includes('/') ? '/' : '\\'}${name.trim()}`
                : `${location ? `${location}/` : ''}${name.trim()}`}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              // Validatie: Naam moet er zijn. Locatie alleen als isLocal.
              disabled={!name.trim() || (isLocal && !location)}
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

      <DirectoryPicker
        isOpen={showPicker}
        onSelect={(path) => {
          setLocation(path)
          setShowPicker(false)
        }}
        onCancel={() => setShowPicker(false)}
      />
    </>
  )
}
