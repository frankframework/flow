import { useState, useEffect } from 'react'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import Button from '~/components/inputs/button'
import { filesystemService } from '~/services/filesystem-service'

interface NewProjectModalProperties {
  isOpen: boolean
  isLocal: boolean
  onClose: () => void
  onCreate: (pathOrName: string) => void
  initialPath?: string
}

export default function NewProjectModal({
  isOpen,
  isLocal,
  onClose,
  onCreate,
  initialPath,
}: Readonly<NewProjectModalProperties>) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (isOpen && isLocal) {
      if (initialPath) {
        setLocation(initialPath)
      } else {
        filesystemService
          .getDefaultPath()
          .then(setLocation)
          .catch(() => setLocation(''))
      }
    } else if (isOpen) {
      setLocation(initialPath ?? '')
    }
  }, [isOpen, isLocal, initialPath])

  if (!isOpen) return null

  const handleCreate = () => {
    if (!name.trim()) return
    if (isLocal && !location) return

    if (isLocal) {
      const separator = location.includes('/') ? '/' : '\\'
      const absolutePath = `${location}${separator}${name.trim()}`
      onCreate(absolutePath)
    } else {
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
                className="border-border bg-background focus:border-foreground-active focus:ring-foreground-active w-full rounded border px-2 py-1 text-sm transition focus:ring-2 focus:outline-none"
                placeholder={isLocal ? 'Select a parent directory...' : 'Workspace root (or browse for subfolder)'}
                onDoubleClick={() => setShowPicker(true)}
              />

              <Button onClick={() => setShowPicker(true)} className="h-8 text-sm">
                Browse...
              </Button>
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
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || (isLocal && !location)}
              className="disabled:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Project
            </Button>

            <Button onClick={handleClose} className="absolute top-3 right-3">
              Close
            </Button>
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
        initialPath={location}
      />
    </>
  )
}
