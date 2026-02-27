import { useProjectStore } from '~/stores/project-store'
import { getAdapterNamesFromConfiguration } from '../studio/xml-to-json-parser'
import { useEffect, useState } from 'react'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import TrashBinIcon from '/icons/solar/Trash Bin.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import { openInStudio, openInEditor } from '~/actions/navigationActions'
import Button from '~/components/inputs/button'
import ConfirmDeleteDialog from '~/components/file-structure/confirm-delete-dialog'

interface ConfigurationTileProperties {
  filepath: string
  relativePath: string
  onDelete: () => Promise<void>
}

export default function ConfigurationTile({ filepath, relativePath, onDelete }: Readonly<ConfigurationTileProperties>) {
  const projectName = useProjectStore((state) => state.project?.name)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [adapterNames, setAdapterNames] = useState<string[]>([])

  useEffect(() => {
    if (!projectName || !filepath) {
      setAdapterNames([])
      return
    }

    getAdapterNamesFromConfiguration(projectName, filepath).then(setAdapterNames)
  }, [projectName, filepath])

  const handleOpenInStudio = (adapterName: string) => {
    openInStudio(adapterName, filepath)
  }

  const handleOpenInEditor = () => {
    const fileName = relativePath.split(/[/\\]/).pop()
    if (!fileName) return

    openInEditor(fileName, filepath)
  }

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true)
      await onDelete()
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="border-border bg-background relative m-2 flex h-75 w-100 flex-col rounded border p-4 shadow-sm">
      {/* Header */}
      <div className="text-foreground mb-3 truncate text-sm font-semibold" title={relativePath}>
        {relativePath}
      </div>
      <button
        onClick={() => setShowDeleteDialog(true)}
        className="text-foreground-muted hover:text-error absolute top-3 right-3 transition hover:cursor-pointer"
      >
        <TrashBinIcon className="h-4 w-4 fill-current" />
      </button>

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
        <Button className="mt-3 flex items-center gap-1" onClick={handleOpenInEditor}>
          <CodeIcon className="h-4 w-4 fill-current" />
          <span className="whitespace-nowrap">Open in Editor</span>
        </Button>
      </div>
      {showDeleteDialog && (
        <ConfirmDeleteDialog
          name={relativePath.split(/[/\\]/).pop() ?? relativePath}
          isFolder={false}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
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
