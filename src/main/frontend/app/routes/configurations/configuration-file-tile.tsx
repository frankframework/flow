import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import TrashBinIcon from '/icons/solar/Trash Bin.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import { useNavigate } from 'react-router'
import { openInStudio, openInEditor } from '~/actions/navigationActions'
import IconButton from '~/components/inputs/icon-button'
import IconLabelButton from '~/components/inputs/icon-label-button'
import ConfirmDeleteDialog from '~/components/file-structure/confirm-delete-dialog'
import { useState } from 'react'

type ConfigurationFileTileProperties = {
  filepath: string
  relativePath: string
  adapterNames: string[]
  onDelete: () => Promise<void>
}

export default function ConfigurationFileTile({
  filepath,
  relativePath,
  adapterNames,
  onDelete,
}: Readonly<ConfigurationFileTileProperties>) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const navigate = useNavigate()

  const handleOpenInStudio = (adapterName: string, adapterPosition: number) => {
    openInStudio(navigate, { adapterName, filepath, adapterPosition })
  }

  const handleOpenInEditor = () => {
    const fileName = relativePath.split(/[/\\]/).pop()
    if (!fileName) return
    openInEditor(fileName, filepath, navigate)
  }

  const handleConfirmDelete = async () => {
    await onDelete()
    setShowDeleteDialog(false)
  }

  return (
    <div className="border-border bg-background flex h-75 w-100 flex-col gap-3 rounded border p-4 shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-foreground min-w-0 flex-1 truncate font-semibold" title={relativePath}>
          {relativePath}
        </p>
        <IconButton title="Delete configuration" onClick={() => setShowDeleteDialog(true)}>
          <TrashBinIcon className="text-foreground-muted group-hover:text-foreground h-4 w-4" />
        </IconButton>
      </div>

      {adapterNames.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <p className="text-foreground-muted text-xs font-semibold tracking-wider uppercase">
            {adapterNames.length === 1 ? 'Adapter' : 'Adapters'}
          </p>
          <div className="border-border flex-1 overflow-y-auto rounded border p-2 inset-shadow-sm">
            <ul className="space-y-2">
              {adapterNames.map((name, index) => (
                <AdapterListItem
                  key={`${name}-${index}`}
                  name={name}
                  adapterPosition={index}
                  onOpenInStudio={handleOpenInStudio}
                />
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-foreground-muted flex-1 text-sm italic">No adapters found</div>
      )}

      <div className="border-border flex justify-center border-t pt-4">
        <IconLabelButton
          icon={<CodeIcon className="h-4 w-4 fill-current" />}
          label="Open in Editor"
          onClick={handleOpenInEditor}
        />
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

type AdapterListItemProperties = {
  name: string
  adapterPosition: number
  onOpenInStudio: (name: string, adapterPosition: number) => void
}

function AdapterListItem({ name, adapterPosition, onOpenInStudio }: Readonly<AdapterListItemProperties>) {
  return (
    <li className="border-border bg-background flex items-center justify-between gap-3 rounded border px-3 py-2 shadow-md">
      <span className="text-foreground min-w-0 flex-1 truncate text-sm" title={name}>
        {name}
      </span>
      <IconLabelButton
        icon={<RulerCrossPenIcon className="h-4 w-4 fill-current" />}
        label="Open in Studio"
        onClick={() => onOpenInStudio(name, adapterPosition)}
      />
    </li>
  )
}
