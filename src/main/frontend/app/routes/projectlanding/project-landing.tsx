import { useEffect, useState } from 'react'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import ArchiveIcon from '/icons/solar/Archive.svg?react'
import ProjectRow from './project-row'
import Search from '~/components/search/search'
import ActionButton from './action-button'
import { useProjectStore } from '~/stores/project-store'
import { useLocation } from 'react-router'
import NewProjectModal from './new-project-modal'
import LoadProjectModal from './load-project-modal'
import { toast, ToastContainer } from 'react-toastify'
import { useTheme } from '~/hooks/use-theme'

export interface Project {
  name: string
  rootPath: string
  filepaths: string[]
  filters: Record<string, boolean> // key = filter name (e.g. "HTTP"), value = true/false
}

export default function ProjectLanding() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showLoadProjectModal, setShowLoadProjectModal] = useState(false)
  const theme = useTheme()

  const clearProject = useProjectStore((state) => state.clearProject)
  const location = useLocation()

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const data = await response.json()
        setProjects(data)
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'Failed to fetch projects')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  // Reset project when landing on home page
  useEffect(() => {
    clearProject()
  }, [location.key, clearProject])

  const createProject = async (projectName: string, rootPath: string) => {
    try {
      const response = await fetch(`/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          rootPath: rootPath ?? undefined,
        }),
      })
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          toast.error(`Error loading project: ${errorData.error}\nDetails: ${errorData.message}`)
          console.error('Something went wrong loading the project:', errorData)
        } else {
          toast.error(`Error loading project. HTTP status: ${response.status}`)
          console.error('Error loading project. HTTP status:', response.status)
        }
        return
      }
      // refresh the project list after creation
      const newProject = await response.json()
      setProjects((previous) => [...previous, newProject])
    } catch (error) {
      toast.error(`Network or unexpected error: ${error}`)
      console.error('Network or unexpected error:', error)
    }
  }

  const handleOpenProject = async () => {
    setShowLoadProjectModal(true)
  }

  // Filter projects by search string (case-insensitive)
  const filteredProjects = projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase()))

  if (loading)
    return (
      <div className="bg-backdrop flex min-h-screen w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading projects...</p>
      </div>
    )
  if (error) return <p>Error: {error}</p>

  return (
    <div className="bg-backdrop flex min-h-screen w-full flex-col items-center pt-20">
      <ToastContainer position="bottom-right" theme={theme} closeOnClick={true} />
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
            <Search onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        {/* Content row */}
        <div className="flex flex-1 overflow-hidden">
          <div className="border-border text-muted-foreground w-1/4 border-r px-4 py-3 text-sm">
            <ActionButton label="New Project" onClick={() => setShowNewProjectModal(true)} />
            <ActionButton label="Open" onClick={handleOpenProject} />
            <ActionButton label="Clone Repository" onClick={() => console.log('Cloning project')} />
          </div>
          <div className="h-full w-3/4 overflow-y-auto px-4 py-3">
            {filteredProjects.map((project, index) => (
              <ProjectRow key={project.name + index} project={project} />
            ))}
          </div>
        </div>
      </div>
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreate={createProject}
      />
      <LoadProjectModal
        isOpen={showLoadProjectModal}
        onClose={() => setShowLoadProjectModal(false)}
        onCreate={createProject}
      />
    </div>
  )
}
