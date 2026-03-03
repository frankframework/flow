import { useCallback, useEffect, useState } from 'react'
import FolderIcon from '/icons/solar/Folder.svg?react'
import { filesystemService } from '~/services/filesystem-service'
import type { FilesystemEntry } from '~/types/filesystem.types'
import { ApiError } from '~/utils/api'
import Button from '../inputs/button'

interface DirectoryPickerProperties {
  isOpen: boolean
  onSelect: (absolutePath: string) => void
  onCancel: () => void
  rootLabel?: string
  initialPath?: string
}

export default function DirectoryPicker({
  isOpen,
  onSelect,
  onCancel,
  rootLabel = 'Computer',
  initialPath,
}: Readonly<DirectoryPickerProperties>) {
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState<FilesystemEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEntries = useCallback(async (path: string) => {
    setLoading(true)
    setError(null)
    setSelectedEntry(null)
    try {
      const result = await filesystemService.browse(path)
      setEntries(result)
      setCurrentPath(path)
    } catch (error_) {
      const status = error_ instanceof ApiError ? error_.status : 0
      if (status === 403) {
        setError('Access denied')
      } else {
        setError(error_ instanceof Error ? error_.message : 'Failed to load directories')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setSelectedEntry(null)
      loadEntries(initialPath ?? '')
    }
  }, [isOpen, loadEntries, initialPath])

  if (!isOpen) return null

  const isRoot = !currentPath
  const canGoUp = !isRoot

  const handleNavigateUp = () => {
    if (/^[a-zA-Z]:[/\\]?$/.test(currentPath) || currentPath === '/') {
      loadEntries('')
      return
    }
    const parentPath = currentPath.replace(/[\\/][^\\/]*$/, '')
    if (!parentPath || parentPath === currentPath) {
      loadEntries('')
    } else if (/^[a-zA-Z]:$/.test(parentPath)) {
      loadEntries(`${parentPath}\\`)
    } else {
      loadEntries(parentPath)
    }
  }

  const handleClick = (entry: FilesystemEntry) => {
    setSelectedEntry(entry.path)
  }

  const handleDoubleClick = (entry: FilesystemEntry) => {
    loadEntries(entry.path)
  }

  const activePath = selectedEntry ?? currentPath

  return (
    <div className="bg-background/50 absolute inset-0 z-[60] flex items-center justify-center">
      <div className="bg-background border-border flex h-[450px] w-[500px] flex-col rounded-lg border shadow-lg">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Select Directory</h3>
          <Button
            onClick={onCancel}
            className="text-foreground-muted hover:text-foreground cursor-pointer text-lg leading-none"
          >
            &times;
          </Button>
        </div>

        <div className="border-border flex items-center gap-2 border-b px-4 py-2">
          <Button
            onClick={handleNavigateUp}
            disabled={!canGoUp}
            className="disabled:text-foreground-muted text-xs disabled:opacity-30"
          >
            ..
          </Button>
          <span className="text-foreground-muted truncate text-xs">{currentPath || rootLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading && <p className="text-foreground-muted p-4 text-center text-xs">Loading...</p>}
          {error && <p className="p-4 text-center text-xs text-red-500">{error}</p>}
          {!loading && !error && entries.length === 0 && (
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
                <span className="relative text-xs">
                  <FolderIcon className="fill-foreground w-4 flex-shrink-0" />
                  {entry.projectRoot && (
                    <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-black" style={{ left: '65%' }} />
                  )}
                </span>
                <span className="truncate">{entry.name}</span>
              </button>
            ))}
        </div>

        <div className="border-border flex items-center justify-between border-t px-4 py-3">
          <span className="text-foreground-muted max-w-[280px] truncate text-xs">
            {activePath || 'Select a directory'}
          </span>
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
