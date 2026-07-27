import { type ReactPortal, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from '~/components/inputs/button'
import { useSubmitOnEnter } from '~/hooks/use-submit-on-enter'

type ConfirmDeleteDialogProperties = {
  name: string
  isFolder: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDeleteDialog({
  name,
  isFolder,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProperties): ReactPortal {
  const overlayReference = useRef<HTMLDivElement>(null)

  useSubmitOnEnter(onConfirm)

  useEffect((): (() => void) => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const handleOverlayClick = (event: React.MouseEvent): void => {
    if (event.target === overlayReference.current) onCancel()
  }

  return createPortal(
    <div
      ref={overlayReference}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={handleOverlayClick}
    >
      <div className="bg-background border-border min-w-64 rounded-md border p-4 shadow-lg">
        <p className="text-foreground mb-4 text-sm">
          Delete {isFolder ? 'folder' : 'file'}
          <br />
          <strong>&#39;{name}&#39;</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} className="px-3 py-1 text-sm">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="px-3 py-1 text-sm">
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
