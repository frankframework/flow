import TrashBinIcon from '/icons/solar/Trash Bin.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import WidgetIcon from '/icons/solar/Widget.svg?react'
import { useNavigate } from 'react-router'
import { useRef, useState, type DragEvent } from 'react'
import { openInStudio, openInEditor } from '~/actions/navigationActions'
import IconButton from '~/components/inputs/icon-button'
import IconLabelButton from '~/components/inputs/icon-label-button'
import ConfirmDeleteDialog from '~/components/file-structure/confirm-delete-dialog'
import LoadingSpinner from '~/components/loading-spinner'
import { getBaseName } from '~/utils/path-utils'
import { type NonCanvasComponent } from '~/services/non-canvas-component-service'
import { isRootConfiguration } from './configuration-utils'
import AdapterListItem from './adapter-list-item'
import ComponentListItem from './component-list-item'
import { frankdocChipStyle } from '~/utils/flow-utils'
import clsx from 'clsx'

type ConfigurationFileTileProperties = {
  filepath: string
  relativePath: string
  adapterNames: string[]
  nonCanvasComponents: NonCanvasComponent[]
  loadingComponents: boolean
  onDelete: () => Promise<void>
  onAddComponent: (configurationPath: string) => void
  onEditComponent: (configurationPath: string, component: NonCanvasComponent) => void
  onConfigureAdapter: (configurationPath: string, adapterName: string, adapterPosition: number) => void
  onDropComponent: (configurationPath: string, tagName: string) => void
  draggedTagName?: string | null
  listViewTile?: boolean
}

export default function ConfigurationFileTile({
  filepath,
  relativePath,
  adapterNames,
  nonCanvasComponents,
  loadingComponents,
  onDelete,
  onAddComponent,
  onEditComponent,
  onConfigureAdapter,
  onDropComponent,
  draggedTagName = null,
  listViewTile = false,
}: Readonly<ConfigurationFileTileProperties>) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const dragDepth = useRef(0)
  const navigate = useNavigate()

  const isComponentDrag = draggedTagName !== null

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isComponentDrag) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!isComponentDrag) return
    event.preventDefault()
    dragDepth.current += 1
    setIsDropTarget(true)
  }

  const handleDragLeave = () => {
    if (!isComponentDrag) return
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDropTarget(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggedTagName) return
    event.preventDefault()
    dragDepth.current = 0
    setIsDropTarget(false)
    onDropComponent(filepath, draggedTagName)
  }

  const handleOpenInStudio = (adapterName: string, adapterPosition: number) => {
    openInStudio(navigate, { adapterName, filepath, adapterPosition })
  }

  const handleOpenInEditor = () => {
    const fileName = getBaseName(relativePath)
    if (!fileName) return
    openInEditor(fileName, filepath, navigate)
  }

  const handleConfirmDelete = async () => {
    await onDelete()
    setShowDeleteDialog(false)
  }

  const hasContent = adapterNames.length > 0 || nonCanvasComponents.length > 0

  let dropZoneClasses = 'border-border'
  if (isDropTarget) {
    dropZoneClasses = 'border-foreground-active ring-foreground-active border-dashed ring-2'
  } else if (isComponentDrag) {
    dropZoneClasses = 'border-foreground-active/50 border-dashed'
  }

  let componentList
  if (loadingComponents && adapterNames.length === 0) {
    componentList = (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="sm" />
      </div>
    )
  } else if (hasContent) {
    componentList = (
      <ul className="space-y-2">
        {adapterNames.map((adapterName, adapterPosition) => (
          <AdapterListItem
            key={`adapter-${adapterName}-${adapterPosition}`}
            adapterName={adapterName}
            adapterPosition={adapterPosition}
            onConfigure={() => onConfigureAdapter(filepath, adapterName, adapterPosition)}
            onOpenInStudio={handleOpenInStudio}
          />
        ))}
        {nonCanvasComponents.map((component) => (
          <ComponentListItem
            key={`component-${component.tagName}-${component.index}`}
            component={component}
            onConfigure={() => onEditComponent(filepath, component)}
          />
        ))}
      </ul>
    )
  } else {
    componentList = <div className="text-foreground-muted py-2 text-sm italic">No adapters or components found</div>
  }

  return (
    <div
      className={clsx(
        `bg-background relative flex flex-col gap-4 rounded border p-6 transition-colors ${dropZoneClasses}`,
        listViewTile ? 'w-full' : 'h-100 w-140',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDropTarget && (
        <div className="bg-foreground-active/10 text-foreground-active pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded text-sm font-semibold">
          Drop to add component
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <p className="text-foreground truncate text-lg font-semibold" title={relativePath}>
            {relativePath}
          </p>
          {isRootConfiguration(relativePath) && (
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]"
              style={frankdocChipStyle('root')}
            >
              Root
            </span>
          )}
        </div>
        <IconButton title="Delete configuration" onClick={() => setShowDeleteDialog(true)}>
          <TrashBinIcon className="text-foreground-muted group-hover:text-foreground h-5 w-5" />
        </IconButton>
      </div>

      <div className="border-border flex min-h-0 grow flex-col gap-2 overflow-auto border-t pt-4">{componentList}</div>

      <div className="border-border flex items-center justify-between border-t pt-4">
        <IconLabelButton
          icon={<CodeIcon className="h-4 w-4 fill-current" />}
          label="Open in Editor"
          onClick={handleOpenInEditor}
        />
        <IconLabelButton
          icon={<WidgetIcon className="h-4 w-4 fill-current" />}
          label="Add non-canvas component"
          onClick={() => onAddComponent(filepath)}
        />
      </div>

      {showDeleteDialog && (
        <ConfirmDeleteDialog
          name={getBaseName(relativePath)}
          isFolder={false}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
