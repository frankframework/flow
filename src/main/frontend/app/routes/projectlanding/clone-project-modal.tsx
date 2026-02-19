import { useState, useEffect } from 'react'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import { filesystemService } from '~/services/filesystem-service'

interface CloneProjectModalProperties {
  isOpen: boolean
  isLocal: boolean
  onClose: () => void
  onClone: (repoUrl: string, localPath: string, token?: string) => void
}

export default function CloneProjectModal({
  isOpen,
  isLocal,
  onClose,
  onClone,
}: Readonly<CloneProjectModalProperties>) {
  const [repoUrl, setRepoUrl] = useState('')
  const [location, setLocation] = useState('')
  const [token, setToken] = useState('')
  const [showPicker, setShowPicker] = useState(false)

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

  const repoName = repoUrl
    .split('/')
    .pop()
    ?.replace(/\.git$/, '')

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
        <div className="bg-background border-border relative w-[600px] rounded-lg border p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Clone Repository</h2>
          <p className="text-foreground-muted mb-4 text-sm">
            {isLocal ? 'Clone a Git repository to a local folder' : 'Clone a Git repository into the workspace'}
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Clone into</label>
            <div className="flex items-center gap-2">
              <input
                value={location || (isLocal ? '' : 'Workspace root')}
                readOnly
                className="border-border bg-backdrop w-full rounded border px-2 py-1 text-sm"
                placeholder={isLocal ? 'Select a parent directory...' : 'Workspace root (or browse for subfolder)'}
                aria-label="clone location"
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
            <label className="mb-1 block text-sm font-medium">Repository URL</label>
            <input
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              className="border-border bg-background focus:border-foreground-active focus:ring-foreground-active w-full rounded border px-2 py-1 text-sm transition focus:ring-2 focus:outline-none"
              placeholder="https://github.com/user/repo.git"
              aria-label="repository url"
            />
          </div>

          {!isLocal && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Access Token</label>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="border-border bg-background focus:border-foreground-active focus:ring-foreground-active w-full rounded border px-2 py-1 text-sm transition focus:ring-2 focus:outline-none"
                placeholder="Personal access token for private repos"
                aria-label="access token"
              />
            </div>
          )}

          {repoName && (
            <p className="text-foreground-muted mb-4 text-xs">
              Will clone to:{' '}
              {isLocal
                ? `${location}${location.includes('/') ? '/' : '\\'}${repoName}`
                : `${location ? `${location}/` : ''}${repoName}`}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleClone}
              disabled={!repoUrl.trim() || (isLocal && !location)}
              className="bg-backdrop hover:bg-background border-border rounded border px-4 py-2 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clone
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
