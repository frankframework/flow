import { useState, useEffect } from 'react'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import Button from '~/components/inputs/button'
import CloseButton from '~/components/inputs/close-button'
import Input from '~/components/inputs/input'
import { filesystemService } from '~/services/filesystem-service'
import { joinPath } from '~/utils/path-utils'

type CloneProjectModalProperties = {
  isLocal: boolean
  onClose: () => void
  onClone: (repoUrl: string, localPath: string, token?: string) => void
  initialPath?: string
}

export default function CloneConfigurationModal({
  isLocal,
  onClose,
  onClone,
  initialPath,
}: Readonly<CloneProjectModalProperties>) {
  const [repoUrl, setRepoUrl] = useState('')
  const [location, setLocation] = useState('')
  const [token, setToken] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (isLocal) {
      filesystemService
        .resolveNearestAccessiblePath(initialPath ?? '')
        .then(setLocation)
        .catch(() => setLocation(''))
      return
    }
    setLocation(initialPath ?? '')
  }, [isLocal, initialPath])

  const repoName = repoUrl
    .split('/')
    .pop()
    ?.replace(/\.git$/i, '')

  const targetName = repoName || 'cloned-project'
  const targetPath = location ? joinPath(location, targetName) : targetName

  const handleClone = () => {
    if (!repoUrl.trim()) return
    if (isLocal && !location) return

    let finalPath: string

    if (isLocal) {
      const separator = location.includes('/') ? '/' : '\\'
      finalPath = `${location}${separator}${repoName}`
    } else {
      const name = repoName || 'cloned-project'
      finalPath = location ? `${location}/${name}` : name
    }

    onClone(repoUrl.trim(), finalPath, token || undefined)
    handleClose()
  }

  const handleClose = () => {
    setRepoUrl('')
    setLocation('')
    setToken('')
    setShowPicker(false)
    onClose()
  }

  return (
    <>
      <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
        <div className="bg-background border-border relative w-150 rounded-lg border p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Clone Repository</h2>
          <p className="text-foreground-muted mb-4 text-sm">
            {isLocal ? 'Clone a Git repository to a local folder' : 'Clone a Git repository into the workspace'}
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Clone into</label>
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
            <label className="mb-1 block text-sm font-medium">Repository URL</label>
            <Input
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/user/repo.git"
              aria-label="repository url"
            />
          </div>

          {!isLocal && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Access Token</label>
              <Input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Personal access token for private repos"
                aria-label="access token"
              />
            </div>
          )}

          {repoName && <p className="text-foreground-muted mb-4 text-xs">Will clone to: {targetPath}</p>}

          <div className="flex gap-2">
            <Button
              onClick={handleClone}
              disabled={!repoUrl.trim() || (isLocal && !location)}
              className="disabled:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clone
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
