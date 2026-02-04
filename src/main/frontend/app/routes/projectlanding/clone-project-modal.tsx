import { useState } from 'react'
import DirectoryPicker from '~/components/directory-picker/directory-picker'

interface CloneProjectModalProperties {
  isOpen: boolean
  onClose: () => void
  onClone: (repoUrl: string, localPath: string) => void
}

export default function CloneProjectModal({ isOpen, onClose, onClone }: Readonly<CloneProjectModalProperties>) {
  const [repoUrl, setRepoUrl] = useState('')
  const [location, setLocation] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  if (!isOpen) return null

  const repoName = repoUrl
    .split('/')
    .pop()
    ?.replace(/\.git$/, '')

  const handleClone = () => {
    if (!repoUrl.trim() || !location) return
    const separator = location.includes('/') ? '/' : '\\'
    const localPath = `${location}${separator}${repoName}`
    onClone(repoUrl.trim(), localPath)
    handleClose()
  }

  const handleClose = () => {
    setRepoUrl('')
    setLocation('')
    setShowPicker(false)
    onClose()
  }

  return (
    <>
      <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
        <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Clone Repository</h2>
          <p className="text-foreground-muted mb-4 text-sm">Clone a Git repository to a local folder</p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Clone into</label>
            <div className="flex items-center gap-2">
              <input
                value={location}
                readOnly
                className="border-border bg-backdrop w-full rounded border px-2 py-1 text-sm"
                placeholder="Select a parent directory..."
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

          {location && repoName && (
            <p className="text-foreground-muted mb-4 text-xs">
              Will clone to: {location}
              {location.includes('/') ? '/' : '\\'}
              {repoName}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleClone}
              disabled={!repoUrl.trim() || !location}
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
