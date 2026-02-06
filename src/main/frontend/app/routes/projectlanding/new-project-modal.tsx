import { useEffect, useState } from 'react'
import { fetchProjectRoot } from '~/services/project-service'

interface NewProjectModalProperties {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, rootPath: string) => void
}

export default function NewProjectModal({ isOpen, onClose, onCreate }: Readonly<NewProjectModalProperties>) {
  const [name, setName] = useState('')
  const [rootPath, setRootPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const rootData = await fetchProjectRoot()
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

  const handleCreate = async () => {
    if (!name.trim()) return
    onCreate(name, rootPath)
    onClose()
  }

  return (
    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
      <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Add Project</h2>
        <p className="mb-4">Add a new project in {rootPath}</p>

        <div className="mb-4 flex items-center gap-2">
          {loading && <p className="text-muted-foreground">Loading rootfolder...</p>}
          {error && <p className="text-destructive">{error}</p>}
          <label className="text-sm font-medium">Projectname</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="border-border bg-background focus:border-foreground-active focus:ring-foreground-active w-full rounded border px-2 py-1 text-sm transition focus:ring-2 focus:outline-none"
            placeholder="Enter project name"
            aria-label="project name"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="bg-backdrop hover:bg-background border-border rounded border px-4 py-2 hover:cursor-pointer"
          >
            Create Project
          </button>

          <button
            onClick={onClose}
            className="bg-background border-border hover:bg-backdrop absolute top-3 right-3 cursor-pointer rounded border px-3 py-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
