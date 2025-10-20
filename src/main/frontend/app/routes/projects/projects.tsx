import { useEffect, useState } from 'react'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'

export default function Projects() {
  const [projects, setProjects] = useState([])
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
          projects.map((project, index) => (
            <div
              key={index}
              className="border-border bg-background flex h-40 w-56 flex-col justify-between rounded-2xl border shadow-md transition-shadow duration-200 hover:shadow-lg"
            >
              <div className="flex flex-1 items-center justify-center px-2">
                <h2 className="text-center text-lg font-semibold break-words">{project.name}</h2>
              </div>

              <div className="flex divide-x divide-gray-200 border-t border-gray-200">
                <button className="hover:text-foreground-active flex flex-1 items-center justify-center p-2 hover:cursor-pointer">
                  <RulerCrossPenIcon className="h-8 w-auto fill-current" />
                  <span className="text-sm font-medium">Open in Builder</span>
                </button>
                <button className="hover:text-foreground-active flex flex-1 items-center justify-center p-2 hover:cursor-pointer">
                  <CodeIcon className="h-8 w-auto fill-current" />
                  <span className="text-sm font-medium">Open in Editor</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>No projects found.</p>
        )}
      </div>
    </div>
  )
}
