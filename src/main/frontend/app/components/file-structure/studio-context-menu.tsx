import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenuDismiss } from '~/hooks/use-context-menu-dismiss'
import type { StudioItemType } from './use-studio-context-menu'

interface StudioContextMenuProps {
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
}: StudioContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  useContextMenuDismiss(menuRef, onClose)

  const itemClass = 'px-3 py-1.5 cursor-pointer hover:bg-hover text-sm text-foreground whitespace-nowrap'

  const showNewConfigurationAndNewFolder = itemType === 'root' || itemType === 'folder'
  const showNewAdapter = itemType === 'configuration'
  const showRenameAndDelete = itemType === 'configuration' || itemType === 'adapter' || itemType === 'folder'

  return createPortal(
    <div
      ref={menuRef}
      className="bg-background border-border fixed z-50 overflow-hidden rounded-md border py-1 shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      {showNewConfigurationAndNewFolder && (
        <div className={itemClass} onClick={() => onNewConfiguration()}>
          New Configuration
        </div>
      )}
      {showNewConfigurationAndNewFolder && (
        <div className={itemClass} onClick={() => onNewFolder()}>
          New Folder
        </div>
      )}
      {showNewAdapter && (
        <div className={itemClass} onClick={() => onNewAdapter()}>
          New Adapter
        </div>
      )}
      {showRenameAndDelete && (
        <div className={itemClass} onClick={() => onRename()}>
          Rename
        </div>
      )}
      {showRenameAndDelete && (
        <div className={`${itemClass} text-red-500`} onClick={() => onDelete()}>
          Delete
        </div>
      )}
    </div>,
    document.body,
  )
}
