import { type MouseEvent, type ReactNode, type ReactPortal } from 'react'
import { createPortal } from 'react-dom'
import CloseButton from '~/components/inputs/close-button'

type DialogProperties = {
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
  overlay?: ReactNode
}
export default function Dialog({
  onClose,
  title,
  children,
  className,
  overlay,
}: Readonly<DialogProperties>): ReactPortal {
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div className="bg-background/50 fixed inset-0 z-50 flex items-center justify-center" onClick={handleBackdropClick}>
      <div className={`bg-background border-border relative rounded-lg border p-6 shadow-lg ${className ?? ''}`}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
        <CloseButton onClick={onClose} className="absolute top-3 right-3" />
      </div>
      {overlay}
    </div>,
    document.body,
  )
}
