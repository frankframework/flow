import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenuDismiss } from '~/hooks/use-context-menu-dismiss'

interface ContextMenuProps {
  position: { x: number; y: number }
  isFolder: boolean
  isRoot?: boolean
  onNewFile: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

export default function ContextMenu({
  position,
  isFolder,
  isRoot = false,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  useContextMenuDismiss(menuRef, onClose)

  const itemClass = 'px-3 py-1.5 cursor-pointer hover:bg-hover text-sm text-foreground whitespace-nowrap'

  return createPortal(
    <div
      ref={menuRef}
      className="bg-background border-border fixed z-50 overflow-hidden rounded-md border py-1 shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      {isFolder && (
        <>
          <div className={itemClass} onClick={() => onNewFile()}>
            New File
          </div>
          <div className={itemClass} onClick={() => onNewFolder()}>
            New Folder
          </div>
        </>
      )}
      {!isRoot && (
        <div className={itemClass} onClick={() => onRename()}>
          Rename
        </div>
      )}
      {!isRoot && (
        <div className={`${itemClass} text-red-500`} onClick={() => onDelete()}>
          Delete
        </div>
      )}
    </div>,
    document.body,
  )
}
