import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ContextMenuProps {
  position: { x: number; y: number }
  isFolder: boolean
  onNewFile: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

export default function ContextMenu({
  position,
  isFolder,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onClose,
}: ContextMenuProps) {
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

  return createPortal(
    <div
      ref={menuRef}
      className="bg-background border-border fixed z-50 overflow-hidden rounded-md border py-1 shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      {isFolder && (
        <>
          <div className={itemClass} onClick={onNewFile}>
            New File
          </div>
          <div className={itemClass} onClick={onNewFolder}>
            New Folder
          </div>
        </>
      )}
      <div className={itemClass} onClick={onRename}>
        Rename
      </div>
      <div className={`${itemClass} text-red-500`} onClick={onDelete}>
        Delete
      </div>
    </div>,
    document.body,
  )
}
