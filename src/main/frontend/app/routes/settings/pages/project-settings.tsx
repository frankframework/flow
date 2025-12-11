import { Link } from 'react-router'
import RoundedToggle from '~/components/inputs/rounded-toggle'
import { useProjectStore } from '~/stores/project-store'

export default function ProjectSettings() {
  const project = useProjectStore((state) => state.project)
  const setProject = useProjectStore((state) => state.setProject)

  const handleToggleFilter = async (filter: string) => {
    if (!project) return

    const currentlyEnabled = project.filters[filter]
    const action = currentlyEnabled ? 'disable' : 'enable'

    try {
      const response = await fetch(
        `/projects/${encodeURIComponent(project.name)}/filters/${encodeURIComponent(filter)}/${action}`,
        { method: 'PATCH' },
      )

      if (!response.ok) throw new Error(`Failed to toggle filter ${filter}`)

      // Update the project in the store
      const updatedFilters = { ...project.filters, [filter]: !currentlyEnabled }
      setProject({ ...project, filters: updatedFilters })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="space-y-3 p-6">
      {project ? (
        // Project loaded: show filters
        <>
          <div className="border-border bg-background rounded-md border p-6">
            <h2 className="text-lg font-semibold">{project.name}</h2>
            <p className="mb-4">Apply project wide settings</p>
          </div>
          <div className="border-border bg-background rounded-md border p-6">
            <h2 className="text-lg font-semibold">Filters</h2>
            <p className="mb-4">Enable or disable filters to only show elements of those types in the studio</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(project.filters).map(([filter, enabled]) => (
                <RoundedToggle
                  key={filter}
                  label={filter}
                  enabled={enabled}
                  onClick={() => handleToggleFilter(filter)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        // No project loaded
        <div className="border-border bg-background text-muted-foreground flex h-64 items-center justify-center rounded-md border p-6 text-center text-sm">
          Load a project in the&nbsp;
          <Link to="/" className="font-medium text-blue-600 hover:underline">
            Project Overview
          </Link>
          &nbsp;to adjust the settings
        </div>
      )}
    </div>
  )
}
