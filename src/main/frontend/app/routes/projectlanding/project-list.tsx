import ConfigurationRow from '~/routes/projectlanding/configuration-row'
import type { FFConfiguration } from '~/services/frank-framework-service'
import type { RecentConfigurationProject } from '~/types/project.types'

export default function ProjectList({
  projects,
  isLocal,
  onProjectClick,
  onRemoveProject,
  onExportProject,
  frameworkInstanceName,
  frameworkConfigurations,
  isDiscovering,
}: {
  projects: RecentConfigurationProject[]
  isLocal: boolean
  onProjectClick: (rootPath: string) => void
  onRemoveProject: (rootPath: string) => void
  onExportProject: (projectName: string) => void
  frameworkInstanceName: string
  frameworkConfigurations: FFConfiguration[]
  isDiscovering: boolean
}): JSX.Element {
  return (
    <section className="h-full flex-1 overflow-y-auto p-4">
      {frameworkConfigurations.length > 0 && (
        <div className="mb-4">
          <p className="text-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Remote</p>
          {frameworkConfigurations.map((configuration): JSX.Element => (
            <div
              key={configuration.name}
              className="hover:bg-backdrop mb-2 flex w-full cursor-pointer items-center justify-between rounded px-3 py-2"
            >
              <div className="flex flex-col">
                <div className="font-medium">{configuration.name}</div>
                {configuration.filename && <p className="text-foreground-muted text-xs">{configuration.filename}</p>}
              </div>
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">{frameworkInstanceName}</span>
            </div>
          ))}
        </div>
      )}
      {isDiscovering && frameworkConfigurations.length === 0 && (
        <p className="text-foreground-muted mb-2 text-xs italic">Scanning for remote instances...</p>
      )}
      {projects.length === 0 && frameworkConfigurations.length === 0 && !isDiscovering && (
        <p className="text-foreground-muted mt-10 text-center text-sm italic">No configurations found</p>
      )}
      {projects.length > 0 && (
        <>
          {projects.map((project): JSX.Element => (
            <ConfigurationRow
              key={project.rootPath}
              project={project}
              isLocal={isLocal}
              onClick={(): void => onProjectClick(project.rootPath)}
              onRemove={(): void => onRemoveProject(project.rootPath)}
              onExport={(): void => onExportProject(project.name)}
            />
          ))}
        </>
      )}
    </section>
  )
}
