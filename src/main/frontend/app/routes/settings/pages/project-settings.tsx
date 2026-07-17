import { Link } from 'react-router'
import RoundedToggle from '~/components/inputs/rounded-toggle'
import { useProjectStore } from '~/stores/project-store'
import { toggleProjectFilter } from '~/services/project-service'

export default function ProjectSettings(): JSX.Element {
  const project = useProjectStore((state): ConfigurationProject | undefined => state.project)
  const setProject = useProjectStore((state): ((project: ConfigurationProject) => void) => state.setProject)

  const handleToggleFilter = async (filter: string): Promise<void> => {
    if (!project) return

    const currentlyEnabled = project.filters[filter]

    try {
      await toggleProjectFilter(project.name, filter, !currentlyEnabled)

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
              {Object.entries(project.filters).map(([filter, enabled]): JSX.Element => (
                <RoundedToggle
                  key={filter}
                  label={filter}
                  enabled={enabled}
                  onClick={(): Promise<void> => handleToggleFilter(filter)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        // No project loaded
        <div className="border-border bg-background text-foreground-muted flex h-64 items-center justify-center rounded-md border p-6 text-center text-sm">
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
