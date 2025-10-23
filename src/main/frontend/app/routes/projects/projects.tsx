import { useEffect, useState } from 'react'
import ProjectTile from '~/routes/projects/project-tile'

export interface Project {
  name: string
  filenames: string[]
}

export default function Projects() {
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

  if (loading) return <p>Loading projects...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Available Projects</h1>

      <div className="flex flex-wrap gap-4">
        {projects.length > 0 ? (
          projects.map((project, index) => <ProjectTile key={index} project={project} />)
        ) : (
          <p>No projects found.</p>
        )}
      </div>
    </div>
  )
}
