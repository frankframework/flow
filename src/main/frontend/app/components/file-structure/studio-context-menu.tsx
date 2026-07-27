import { type ReactPortal, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenuDismiss } from '~/hooks/use-context-menu-dismiss'
import type { StudioItemType } from './use-studio-context-menu'

type StudioContextMenuProperties = {
  position: { x: number; y: number }
  itemType: StudioItemType
  onNewConfiguration: () => void
  onNewAdapter: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

export default function StudioContextMenu({
  position,
  itemType,
  onNewConfiguration,
  onNewAdapter,
  onNewFolder,
  onRename,
  onDelete,
  onClose,
}: StudioContextMenuProperties): ReactPortal {
  const menuReference = useRef<HTMLDivElement>(null)
  useContextMenuDismiss(menuReference, onClose)

  const itemClass = 'px-3 py-1.5 cursor-pointer hover:bg-hover text-sm text-foreground whitespace-nowrap'

  const showNewConfigurationAndNewFolder = itemType === 'root' || itemType === 'folder'
  const showNewAdapter = itemType === 'configuration'
  const showRenameAndDelete = ['configuration', 'adapter', 'folder', 'file'].includes(itemType)

  return createPortal(
    <div
      ref={menuReference}
      className="bg-background border-border fixed z-50 overflow-hidden rounded-md border py-1 shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      {showNewConfigurationAndNewFolder && (
        <div className={itemClass} onClick={(): void => onNewConfiguration()}>
          New Configuration File
        </div>
      )}
      {showNewConfigurationAndNewFolder && (
        <div className={itemClass} onClick={(): void => onNewFolder()}>
          New Folder
        </div>
      )}
      {showNewAdapter && (
        <div className={itemClass} onClick={(): void => onNewAdapter()}>
          New Adapter
        </div>
      )}
      {showRenameAndDelete && (
        <div className={itemClass} onClick={(): void => onRename()}>
          Rename
        </div>
      )}
      {showRenameAndDelete && (
        <div className={`${itemClass} text-red-500`} onClick={(): void => onDelete()}>
          Delete
        </div>
      )}
    </div>,
    document.body,
  )
}
