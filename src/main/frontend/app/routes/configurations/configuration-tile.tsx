import { useProjectStore } from '~/stores/project-store'
import { getAdapterNamesFromConfiguration } from '../studio/xml-to-json-parser'
import { useEffect, useState } from 'react'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'

interface ConfigurationTileProperties {
  filepath: string
  relativePath: string
}

export default function ConfigurationTile({ filepath, relativePath }: Readonly<ConfigurationTileProperties>) {
  const projectName = useProjectStore((state) => state.project?.name)

  const [adapterNames, setAdapterNames] = useState<string[]>([])

  useEffect(() => {
    if (!projectName || !filepath) {
      setAdapterNames([])
      return
    }

    getAdapterNamesFromConfiguration(projectName, filepath).then(setAdapterNames)
  }, [projectName, filepath])

  return (
    <div className="border-border bg-background relative m-2 flex h-50 w-75 flex-col rounded border p-4 shadow-sm">
      {/* Header */}
      <div className="text-foreground mb-3 truncate text-sm font-semibold" title={relativePath}>
        {relativePath}
      </div>

      {/* Adapter list */}
      {adapterNames.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {adapterNames.map((name) => (
              <li
                key={name}
                className="border-border bg-muted flex items-center justify-between rounded border px-2 py-1"
              >
                <span className="text-foreground truncate text-xs">{name}</span>

                <button
                  className="bg-primary text-primary-foreground hover:text-foreground-active ml-2 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition hover:cursor-pointer"
                  onClick={() => {
                    /* open this adapter in studio */
                  }}
                >
                  <RulerCrossPenIcon className="h-4 w-4 fill-current" />
                  Open in Studio
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-muted-foreground text-xs italic">No adapters found</div>
      )}
    </div>
  )
}
