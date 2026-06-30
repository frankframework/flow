import { useState, useEffect } from 'react'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import Button from '~/components/inputs/button'
import CloseButton from '~/components/inputs/close-button'
import Input from '~/components/inputs/input'
import { filesystemService } from '~/services/filesystem-service'

type NewProjectModalProperties = {
  isLocal: boolean
  onClose: () => void
  onCreate: (name: string, rootPath: string) => void
  initialPath: string
}

const CONFIG_DIR = 'src/main/configurations'

export default function NewConfigurationModal({
  isLocal,
  onClose,
  onCreate,
  initialPath,
}: Readonly<NewProjectModalProperties>) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (!isLocal) {
      setLocation(initialPath)
      return
    }

    filesystemService
      .resolveNearestAccessiblePath(initialPath)
      .then(setLocation)
      .catch(() => setLocation(''))
  }, [isLocal, initialPath])

  const handleCreate = () => {
    if (!name.trim() || (isLocal && !location)) return
    const trimmedName = name.trim()
    onCreate(trimmedName, location ?? '')
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
        <div className="bg-background border-border relative h-100 w-150 rounded-lg border p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">New Configuration Project</h2>
          <p className="text-foreground-muted mb-4 text-sm">
            {isLocal ? 'Create a new FF! configuration on disk' : 'Create a new FF! configuration in the workspace'}
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Location</label>
            <div className="flex items-center gap-2">
              <Input
                value={location || (isLocal ? '' : 'Workspace root')}
                readOnly
                placeholder={isLocal ? 'Select a parent directory...' : 'Workspace root (or browse for subfolder)'}
                onDoubleClick={() => setShowPicker(true)}
              />

              <Button onClick={() => setShowPicker(true)} className="text-sm">
                Browse...
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Configuration Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter configuration name"
            />
          </div>

          {name.trim() && (
            <p className="text-foreground-muted mb-4 text-xs break-all">
              Project will be created at:<br></br>
              {getConfigurationPath(location, name, isLocal)}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || (isLocal && !location)}
              className="disabled:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Configuration
            </Button>

            <CloseButton onClick={handleClose} className="absolute top-3 right-3" />
          </div>
        </div>
      </div>

      {showPicker && (
        <DirectoryPicker
          onSelect={(path) => {
            setLocation(path)
            setShowPicker(false)
          }}
          onCancel={() => setShowPicker(false)}
          initialPath={location}
        />
      )}
    </>
  )
}

function getConfigurationPath(location: string, name: string, isLocal: boolean) {
  let configPath = isLocal ? location.replace('\\', '/') : location
  if (!configPath.endsWith(CONFIG_DIR)) {
    configPath = `${configPath}/${CONFIG_DIR}`
  }
  return `${configPath}/${name.trim()}`
}
