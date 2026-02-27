import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from '~/components/inputs/button'

interface ConfirmDeleteDialogProps {
  name: string
  isFolder: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDeleteDialog({ name, isFolder, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={handleOverlayClick}
    >
      <div className="bg-background border-border w-80 rounded-md border p-4 shadow-lg">
        <p className="text-foreground mb-4 text-sm">
          Delete {isFolder ? 'folder' : 'file'} <strong>&#39;{name}&#39;</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} className="px-3 py-1 text-sm">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
