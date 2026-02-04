import { useCallback, useEffect, useState } from 'react'
import { filesystemService } from '~/services/filesystem-service'
import type { FilesystemEntry } from '~/types/filesystem.types'

interface DirectoryPickerProperties {
  isOpen: boolean
  onSelect: (absolutePath: string) => void
  onCancel: () => void
}

export default function DirectoryPicker({ isOpen, onSelect, onCancel }: Readonly<DirectoryPickerProperties>) {
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
      setError(error_ instanceof Error ? error_.message : 'Failed to load directories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setSelectedEntry(null)
      loadEntries('')
    }
  }, [isOpen, loadEntries])

  if (!isOpen) return null

  const parentPath = currentPath ? currentPath.replace(/[\\/][^\\/]*$/, '') : ''
  const isRoot = !currentPath
  const canGoUp = !isRoot

  const handleNavigateUp = () => {
    if (parentPath === currentPath) {
      loadEntries('')
    } else {
      loadEntries(parentPath)
    }
  }

  const handleClick = (entry: FilesystemEntry) => {
    setSelectedEntry(entry.absolutePath)
  }

  const handleDoubleClick = (entry: FilesystemEntry) => {
    loadEntries(entry.absolutePath)
  }

  const activePath = selectedEntry ?? currentPath

  return (
    <div className="bg-background/50 absolute inset-0 z-[60] flex items-center justify-center">
      <div className="bg-background border-border flex h-[450px] w-[500px] flex-col rounded-lg border shadow-lg">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Select Directory</h3>
          <button onClick={onCancel} className="text-foreground-muted hover:text-foreground text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="border-border flex items-center gap-2 border-b px-4 py-2">
          <button
            onClick={handleNavigateUp}
            disabled={!canGoUp}
            className="bg-backdrop border-border rounded border px-2 py-0.5 text-xs disabled:opacity-30"
          >
            ..
          </button>
          <span className="text-foreground-muted truncate text-xs">{currentPath || 'Computer'}</span>
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
                key={entry.absolutePath}
                onClick={() => handleClick(entry)}
                onDoubleClick={() => handleDoubleClick(entry)}
                className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm ${
                  selectedEntry === entry.absolutePath ? 'bg-backdrop font-medium' : 'hover:bg-backdrop/50'
                }`}
              >
                <span className="text-xs">📁</span>
                <span className="truncate">{entry.name}</span>
              </button>
            ))}
        </div>

        <div className="border-border flex items-center justify-between border-t px-4 py-3">
          <span className="text-foreground-muted max-w-[280px] truncate text-xs">
            {activePath || 'Select a directory'}
          </span>
          <div className="flex gap-2">
            <button onClick={onCancel} className="border-border hover:bg-backdrop rounded border px-3 py-1 text-sm">
              Cancel
            </button>
            <button
              onClick={() => onSelect(activePath)}
              disabled={!activePath}
              className="bg-backdrop hover:bg-background border-border rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
