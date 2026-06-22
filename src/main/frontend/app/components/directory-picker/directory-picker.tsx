import { useCallback, useEffect, useState } from 'react'
import FolderIcon from '/icons/solar/Folder.svg?react'
import NameInputDialog from '~/components/file-structure/name-input-dialog'
import { filesystemService } from '~/services/filesystem-service'
import type { FilesystemEntry } from '~/types/filesystem.types'
import { ApiError } from '~/utils/api'
import { useDirectoryWatcher } from '~/hooks/use-file-watcher'
import Button from '../inputs/button'
import CloseButton from '../inputs/close-button'

interface DirectoryPickerProperties {
  onSelect: (absolutePath: string) => void
  onCancel: () => void
  rootLabel?: string
  initialPath?: string
}

export default function DirectoryPicker({
  onSelect,
  onCancel,
  rootLabel = 'Computer',
  initialPath,
}: Readonly<DirectoryPickerProperties>) {
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState('')
  const [entries, setEntries] = useState<FilesystemEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  const loadEntries = useCallback(async (path: string) => {
    setLoading(true)
    setError(null)
    setSelectedEntry(null)
    setIsCreatingFolder(false)
    try {
      const result = await filesystemService.browse(path)
      setEntries(result.entries)
      setCurrentPath(result.resolvedPath)
      setParentPath(result.parentPath)
    } catch (error) {
      if (error instanceof ApiError && error.httpCode === 403) {
        setError('Access denied')
      } else {
        setError(error instanceof Error ? error.message : 'Failed to load directories')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useDirectoryWatcher(currentPath, () => void loadEntries(currentPath))

  useEffect(() => {
    setSelectedEntry(null)
    loadEntries(initialPath ?? '')
  }, [loadEntries, initialPath])

  const handleClick = (entry: FilesystemEntry) => {
    setSelectedEntry(entry.path)
  }

  const handleDoubleClick = (entry: FilesystemEntry) => {
    loadEntries(entry.path)
  }

  const handleCreateFolder = async (folderName: string) => {
    const basePath = selectedEntry ?? currentPath
    const separator = basePath.includes('\\') ? '\\' : '/'
    const newPath = `${basePath}${separator}${folderName}`
    setIsCreatingFolder(false)
    try {
      await filesystemService.createDirectory(newPath)
      await loadEntries(basePath)
      setSelectedEntry(newPath)
    } catch {
      setError('Failed to create folder')
    }
  }

  const canGoUp = parentPath !== ''
  const activePath = selectedEntry ?? currentPath

  return (
    <div className="bg-background/50 absolute inset-0 z-60 flex items-center justify-center">
      <div className="bg-background border-border flex h-112.5 w-1/3 min-w-125 flex-col rounded-lg border shadow-lg">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Select Directory</h3>
          <CloseButton onClick={onCancel} />
        </div>

        <div className="border-border flex items-center gap-2 border-b px-4 py-2">
          <Button
            onClick={() => loadEntries(parentPath)}
            disabled={!canGoUp}
            className="disabled:text-foreground-muted text-xs disabled:opacity-30"
          >
            ..
          </Button>
          <span className="text-foreground-muted flex-1 truncate text-xs">{currentPath || rootLabel}</span>
          {currentPath && !isCreatingFolder && (
            <Button
              onClick={() => setIsCreatingFolder(true)}
              className="text-foreground-muted hover:text-foreground shrink-0 text-xs"
              title="Create a new folder here"
            >
              New Folder
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loading && <p className="text-foreground-muted p-4 text-center text-xs">Loading…</p>}
          {error && <p className="p-4 text-center text-xs text-red-500">{error}</p>}

          {!loading && !error && entries.length === 0 && !isCreatingFolder && (
            <p className="text-foreground-muted p-4 text-center text-xs italic">No subdirectories</p>
          )}

          {!loading &&
            !error &&
            entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => handleClick(entry)}
                onDoubleClick={() => handleDoubleClick(entry)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-left text-sm ${
                  selectedEntry === entry.path ? 'bg-backdrop font-medium' : 'hover:bg-backdrop/50'
                }`}
              >
                <span className="relative shrink-0 text-xs">
                  <FolderIcon className="fill-foreground w-4" />
                  {entry.projectRoot && (
                    <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-black" style={{ left: '65%' }} />
                  )}
                </span>
                <span className="truncate">{entry.name}</span>
              </button>
            ))}

          {isCreatingFolder && (
            <NameInputDialog
              title="New Folder"
              submitLabel="Create"
              onSubmit={(name) => void handleCreateFolder(name)}
              onCancel={() => setIsCreatingFolder(false)}
            />
          )}
        </div>

        <div className="border-border flex items-center justify-between border-t px-4 py-3">
          <span className="text-foreground-muted truncate text-xs">{activePath || 'Select a directory'}</span>
          <div className="flex gap-2">
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              onClick={() => onSelect(activePath)}
              disabled={!activePath}
              className="disabled:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Select
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
