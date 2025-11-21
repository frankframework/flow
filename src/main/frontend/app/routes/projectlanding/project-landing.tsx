import { useEffect, useState } from 'react'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import ArchiveIcon from '/icons/solar/Archive.svg?react'
import ProjectRow from './project-row'
import Search from '~/components/search/search'
import ActionButton from './action-button'

interface Project {
  name: string
  filenames: string[]
  filters: Record<string, boolean> // key = filter name (e.g. "HTTP"), value = true/false
}

export default function ProjectLanding() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('http://localhost:8080/projects')
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const data = await response.json()
        setProjects(data)
      } catch (error_) {
        setError(error_.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const createProject = async () => {
    try {
      const projectName = 'testproject_' + `${projects.length + 1}`
      const response = await fetch(`http://localhost:8080/projects/${projectName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      // refresh the project list after creation
      const newProject = await response.json()
      setProjects((previous) => [...previous, newProject])
      console.log('Project created:', newProject)
    } catch (error_: any) {
      setError(error_.message)
    }
  }

  if (loading) return <p>Loading projects...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <div className="bg-backdrop flex min-h-screen w-full flex-col items-center pt-20">
      <div className="relative mb-6 flex w-2/5 flex-row items-center">
        <div className="flex w-1/4 flex-row items-center">
          <FfIcon className="h-auto w-12" />
          <div className="px-2 text-lg font-semibold">Flow</div>
        </div>
      </div>
      <div
        className="border-border bg-background flex min-h-[400px] w-2/5 flex-col rounded border shadow"
        style={{ height: 400 }}
      >
        {/* Header row */}
        <div className="border-border flex h-12 border-b">
          <div className="border-border flex w-1/4 items-center border-r px-4 text-sm font-semibold">
            <ArchiveIcon className="mr-2 h-5 w-auto" /> Projects
          </div>
          <div className="flex w-3/4 items-center justify-center px-4 text-sm font-semibold">
            <Search onChange={() => console.log('searching...')} />
          </div>
        </div>
        {/* Content row */}
        <div className="flex flex-1 overflow-hidden">
          <div className="border-border text-muted-foreground w-1/4 border-r px-4 py-3 text-sm">
            {/* Info column content here */}
            <ActionButton label="New Project" onClick={createProject} />
            <ActionButton label="Open" onClick={() => console.log('Open project')} />
            <ActionButton label="Clone Repository" onClick={() => console.log('Cloning project')} />
          </div>
          <div className="h-full w-3/4 overflow-y-auto px-4 py-3">
            {/* Main content column */}
            {projects.map((project, index) => (
              <ProjectRow key={project.name + index} project={project} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
