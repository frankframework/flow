import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import TrashBinIcon from '/icons/solar/Trash Bin.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import WidgetIcon from '/icons/solar/Widget.svg?react'
import TuningIcon from '/icons/solar/Tuning.svg?react'
import { useNavigate } from 'react-router'
import { openInStudio, openInEditor } from '~/actions/navigationActions'
import IconButton from '~/components/inputs/icon-button'
import IconLabelButton from '~/components/inputs/icon-label-button'
import ConfirmDeleteDialog from '~/components/file-structure/confirm-delete-dialog'
import LoadingSpinner from '~/components/loading-spinner'
import { NON_CANVAS_DRAG_TYPE, type NonCanvasElement } from '~/services/non-canvas-element-service'
import {useRef, useState} from 'react'
import { getBaseName } from '~/utils/path-utils'

type ConfigurationFileTileProperties = {
  filepath: string
  relativePath: string
  adapterNames: string[]
  nonCanvasElements: NonCanvasElement[]
  loadingElements: boolean
  onDelete: () => Promise<void>
  onAddElement: (configurationPath: string) => void
  onEditElement: (configurationPath: string, element: NonCanvasElement) => void
  onDropElement: (configurationPath: string, tagName: string) => void
  dragActive?: boolean
}

function isRootConfiguration(relativePath: string): boolean {
  return relativePath.split(/[/\\]/).pop()?.toLowerCase() === 'configuration.xml'
}

function isElementDrag(event: DragEvent<HTMLDivElement>): boolean {
  return event.dataTransfer.types.includes(NON_CANVAS_DRAG_TYPE)
}

function handleDragOver(event: DragEvent<HTMLDivElement>) {
  if (!isElementDrag(event)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

export default function ConfigurationFileTile({
  filepath,
  relativePath,
  adapterNames,
  nonCanvasElements,
  loadingElements,
  onDelete,
  onAddElement,
  onEditElement,
  onDropElement,
  dragActive = false,
}: Readonly<ConfigurationFileTileProperties>) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const dragDepth = useRef(0)
  const navigate = useNavigate()

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!isElementDrag(event)) return
    event.preventDefault()
    dragDepth.current += 1
    setIsDropTarget(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!isElementDrag(event)) return
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDropTarget(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isElementDrag(event)) return
    event.preventDefault()
    dragDepth.current = 0
    setIsDropTarget(false)
    const tagName = event.dataTransfer.getData(NON_CANVAS_DRAG_TYPE)
    if (tagName) onDropElement(filepath, tagName)
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

  const hasContent = adapterNames.length > 0 || nonCanvasElements.length > 0

  let dropZoneClasses = 'border-border'
  if (isDropTarget) {
    dropZoneClasses = 'border-foreground-active ring-foreground-active border-dashed ring-2'
  } else if (dragActive) {
    dropZoneClasses = 'border-foreground-active/50 border-dashed'
  }

  let elementList
  if (loadingElements && adapterNames.length === 0) {
    elementList = (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="sm" />
      </div>
    )
  } else if (hasContent) {
    elementList = (
      <ul className="space-y-2">
        {adapterNames.map((adapterName, adapterPosition) => (
          <AdapterListItem
            key={`adapter-${adapterName}-${adapterPosition}`}
            adapterName={adapterName}
            adapterPosition={adapterPosition}
            onOpenInStudio={handleOpenInStudio}
          />
        ))}
        {nonCanvasElements.map((element) => (
          <NonCanvasElementListItem
            key={`element-${element.tagName}-${element.index}`}
            element={element}
            onConfigure={() => onEditElement(filepath, element)}
          />
        ))}
      </ul>
    )
  } else {
    elementList = <div className="text-foreground-muted py-2 text-sm italic">No adapters or elements found</div>
  }

  return (
    <div
      className={`bg-background relative flex w-full flex-col gap-4 rounded border p-6 shadow-md transition-colors ${dropZoneClasses}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDropTarget && (
        <div className="bg-foreground-active/10 text-foreground-active pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded text-sm font-semibold">
          Drop to add element
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <p className="text-foreground truncate text-lg font-semibold" title={relativePath}>
            {relativePath}
          </p>
          {isRootConfiguration(relativePath) && (
            <span className="rounded bg-green-500 px-2 py-0.5 text-xs font-bold text-black dark:bg-green-800 dark:text-green-200">
              Root
            </span>
          )}
        </div>
        <IconButton title="Delete configuration" onClick={() => setShowDeleteDialog(true)}>
          <TrashBinIcon className="text-foreground-muted group-hover:text-foreground h-5 w-5" />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-col gap-2">
        <p className="text-foreground-muted text-xs font-semibold tracking-wider uppercase">Adapters &amp; elements</p>
        <div className="border-border max-h-96 overflow-y-auto rounded border p-3 inset-shadow-sm">{elementList}</div>
      </div>

      <div className="border-border flex items-center justify-between border-t pt-4">
        <IconLabelButton
          icon={<CodeIcon className="h-4 w-4 fill-current" />}
          label="Open in Editor"
          onClick={handleOpenInEditor}
        />
        <IconLabelButton
          icon={<WidgetIcon className="h-4 w-4 fill-current" />}
          label="Add non-canvas element"
          onClick={() => onAddElement(filepath)}
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

type AdapterListItemProperties = {
  adapterName: string
  adapterPosition: number
  onOpenInStudio: (adapterName: string, adapterPosition: number) => void
}

function AdapterListItem({ adapterName, adapterPosition, onOpenInStudio }: Readonly<AdapterListItemProperties>) {
  return (
    <li className="border-border bg-background flex items-center justify-between gap-3 rounded border px-4 py-3 shadow-md">
      <span className="text-foreground min-w-0 flex-1 truncate" title={adapterName}>
        {adapterName}
      </span>
      <IconLabelButton
        icon={<RulerCrossPenIcon className="h-4 w-4 fill-current" />}
        label="Open in Studio"
        onClick={() => onOpenInStudio(adapterName, adapterPosition)}
      />
    </li>
  )
}

type NonCanvasElementListItemProperties = {
  element: NonCanvasElement
  onConfigure: () => void
}

function NonCanvasElementListItem({ element, onConfigure }: Readonly<NonCanvasElementListItemProperties>) {
  const label = element.name ? `${element.tagName} · ${element.name}` : element.tagName
  return (
    <li className="border-border bg-background flex items-center justify-between gap-3 rounded border px-4 py-3 shadow-md">
      <span className="text-foreground min-w-0 flex-1 truncate" title={label}>
        {label}
      </span>
      <IconLabelButton icon={<TuningIcon className="h-4 w-4 fill-current" />} label="Configure" onClick={onConfigure} />
    </li>
  )
}
