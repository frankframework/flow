import { useEffect, useState } from 'react'
import FolderIcon from '../../../icons/solar/Folder.svg?react'
import { apiUrl } from '~/utils/api'

interface LoadProjectModalProperties {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, rootPath: string) => void
}

export default function LoadProjectModal({ isOpen, onClose, onCreate }: Readonly<LoadProjectModalProperties>) {
  const [folders, setFolders] = useState<string[]>([])
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [foldersResponse, rootResponse] = await Promise.all([
          fetch(apiUrl('/api/projects/backend-folders')),
          fetch(apiUrl('/api/projects/root')),
        ])

        if (!foldersResponse.ok) {
          throw new Error(`Folders HTTP error! Status: ${foldersResponse.status}`)
        }
        if (!rootResponse.ok) {
          throw new Error(`Root HTTP error! Status: ${rootResponse.status}`)
        }

        const foldersData = await foldersResponse.json()
        const rootData = await rootResponse.json()

        setFolders(foldersData)
        setRootPath(rootData.rootPath)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch project data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen])

  if (!isOpen) return null

  const handleCreate = (name: string) => {
    onCreate(name, rootPath || '')
    onClose()
  }

  return (
    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
      <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
        {/* Header */}
        <div className="border-border flex flex-col gap-1 border-b px-4 py-2">
          <h2 className="text-sm font-semibold">Load Project</h2>
          {rootPath && <p className="text-muted-foreground truncate text-xs">Root: {rootPath}</p>}
        </div>

        {/* Content */}
        <div className="max-h-64 overflow-y-auto px-4 py-3 text-sm">
          {loading && <p className="text-muted-foreground">Loading folders...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && !error && folders.length === 0 && <p className="text-muted-foreground">No folders found.</p>}

          <ul className="border-border space-y-1 rounded border p-2">
            {folders.map((folder) => (
              <li
                key={folder}
                onClick={() => handleCreate(folder)}
                className="hover:bg-backdrop flex items-center gap-2 rounded-md px-2 py-1 hover:cursor-pointer"
              >
                <FolderIcon className="fill-foreground h-4 w-4 shrink-0" />
                <span className="truncate">{folder}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="bg-background border-border hover:bg-backdrop absolute top-3 right-3 cursor-pointer rounded border px-3 py-1"
        >
          Close
        </button>
      </div>
    </div>
  )
}
