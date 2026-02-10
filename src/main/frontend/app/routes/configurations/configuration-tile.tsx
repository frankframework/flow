import { useProjectStore } from '~/stores/project-store'
import { getAdapterNamesFromConfiguration } from '../studio/xml-to-json-parser'
import { useEffect, useState } from 'react'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import useTabStore from '~/stores/tab-store'
import { useNavigationStore } from '~/stores/navigation-store'
import useEditorTabStore from '~/stores/editor-tab-store'

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

  const handleOpenInStudio = (adapterName: string) => {
    const { setTabData, setActiveTab, getTab } = useTabStore.getState()
    if (!getTab(adapterName)) {
      setTabData(adapterName, {
        name: adapterName,
        configurationPath: filepath,
        flowJson: {},
      })
    }
    setActiveTab(adapterName)
    useNavigationStore.getState().navigate('studio')
  }

  const handleOpenInEditor = () => {
    const { setTabData, setActiveTab, getTab } = useEditorTabStore.getState()
    if (!getTab(relativePath)) {
      setTabData(relativePath, {
        name: relativePath,
        configurationPath: filepath,
      })
    }
    setActiveTab(relativePath)
    useNavigationStore.getState().navigate('editor')
  }

  return (
    <div className="border-border bg-background relative m-2 flex h-75 w-100 flex-col rounded border p-4 shadow-sm">
      {/* Header */}
      <div className="text-foreground mb-3 truncate text-sm font-semibold" title={relativePath}>
        {relativePath}
      </div>

      {/* Adapter list */}
      {adapterNames.length > 0 ? (
        <>
          <h1 className="text-foreground mb-2 text-xs">
            Adapter{adapterNames.length == 1 ? '' : 's'} within this configuration:
          </h1>
          <div className="bg-backdrop border-border flex-1 overflow-y-auto rounded border p-2">
            <ul className="space-y-2">
              {adapterNames.map((name) => (
                <AdapterListItem key={name} name={name} onOpenInStudio={handleOpenInStudio} />
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground flex-1 text-xs italic">No adapters found</div>
      )}

      {/* Bottom action */}
      <div className="border-border mt-3 flex justify-center border-t">
        <button
          className="bg-primary text-primary-foreground hover:text-foreground-active flex items-center gap-1 rounded px-3 py-2 font-medium transition hover:cursor-pointer"
          onClick={handleOpenInEditor}
        >
          <CodeIcon className="h-4 w-4 fill-current" />
          <span className="whitespace-nowrap">Open in Editor</span>
        </button>
      </div>
    </div>
  )
}

interface AdapterListItemProps {
  name: string
  onOpenInStudio: (name: string) => void
}

function AdapterListItem({ name, onOpenInStudio }: AdapterListItemProps) {
  return (
    <li className="border-border bg-background flex items-center rounded border px-2 py-1">
      {/* Adapter name – 2/3 */}
      <span className="text-foreground border-border w-2/3 truncate border-r text-xs" title={name}>
        {name}
      </span>

      {/* Button – 1/3 */}
      <button
        className="bg-primary text-primary-foreground hover:text-foreground-active ml-2 flex w-1/3 items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium transition hover:cursor-pointer"
        onClick={() => onOpenInStudio(name)}
      >
        <RulerCrossPenIcon className="h-4 w-4 fill-current" />
        <span className="whitespace-normal">Open in Studio</span>
      </button>
    </li>
  )
}
