import { type ReactPortal, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenuDismiss } from '~/hooks/use-context-menu-dismiss'

type ContextMenuProperties = {
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
}: ContextMenuProperties): ReactPortal {
  const menuReference = useRef<HTMLDivElement>(null)
  useContextMenuDismiss(menuReference, onClose)

  const itemClass = 'px-3 py-1.5 cursor-pointer hover:bg-hover text-sm text-foreground whitespace-nowrap'

  return createPortal(
    <div
      ref={menuReference}
      className="bg-background border-border fixed z-50 overflow-hidden rounded-md border py-1 shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      {isFolder && (
        <>
          <div className={itemClass} onClick={(): void => onNewFile()}>
            New File
          </div>
          <div className={itemClass} onClick={(): void => onNewFolder()}>
            New Folder
          </div>
        </>
      )}
      {!isRoot && (
        <div className={itemClass} onClick={(): void => onRename()}>
          Rename
        </div>
      )}
      {!isRoot && (
        <div className={`${itemClass} text-red-500`} onClick={(): void => onDelete()}>
          Delete
        </div>
      )}
    </div>,
    document.body,
  )
}
