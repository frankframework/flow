import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const itemClass = 'px-3 py-1.5 cursor-pointer hover:bg-hover text-sm text-foreground whitespace-nowrap'

  const showNewConfiguration = itemType === 'root' || itemType === 'folder'
  const showNewFolder = itemType === 'root' || itemType === 'folder'
  const showNewAdapter = itemType === 'configuration'
  const showRename = itemType === 'configuration' || itemType === 'adapter' || itemType === 'folder'
  const showDelete = itemType === 'configuration' || itemType === 'adapter' || itemType === 'folder'

  return createPortal(
    <div
      ref={menuRef}
      className="bg-background border-border fixed z-50 overflow-hidden rounded-md border py-1 shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      {showNewConfiguration && (
        <div className={itemClass} onClick={() => onNewConfiguration()}>
          New Configuration
        </div>
      )}
      {showNewFolder && (
        <div className={itemClass} onClick={() => onNewFolder()}>
          New Folder
        </div>
      )}
      {showNewAdapter && (
        <div className={itemClass} onClick={() => onNewAdapter()}>
          New Adapter
        </div>
      )}
      {showRename && (
        <div className={itemClass} onClick={() => onRename()}>
          Rename
        </div>
      )}
      {showDelete && (
        <div className={`${itemClass} text-red-500`} onClick={() => onDelete()}>
          Delete
        </div>
      )}
    </div>,
    document.body,
  )
}
