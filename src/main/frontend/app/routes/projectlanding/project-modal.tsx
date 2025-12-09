import { useState } from 'react'

interface ProjectModalProperties {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

export default function ProjectModal({ isOpen, onClose, onCreate }: Readonly<ProjectModalProperties>) {
  if (!isOpen) return null

  const [name, setName] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    onCreate(name)
    onClose()
  }

  return (
    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
      <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Add Project</h2>
        <p className="mb-4">Add a new project</p>

        <div className="mb-4 flex items-center gap-2">
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
