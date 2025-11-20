import { useEffect, useState } from 'react'
import FfIcon from '/icons/custom/ff!-icon.svg?react'

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

  if (loading) return <p>Loading projects...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <div className="flex flex-col items-center px-10 py-4">
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-start justify-start">
          <FfIcon className="h-auto w-12" />
          <div className="px-2">Flow</div>
        </div>
        <div className="bg-foreground h-100 w-full"></div>
      </div>
    </div>
  )
}
