import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '~/hooks/use-theme'

import CloseButton from './datamapper/basic-components/close-button'

interface ModalProperties {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

function Modal({ isOpen, onClose, title, children }: ModalProperties) {
  const theme = useTheme()

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/40"
      onClick={onClose} // Closes the modal when clicking outside of the modal
    >
      <div
        className="bg-background relative rounded-lg p-5 shadow-lg"
        data-theme={theme}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-xl font-bold">{title}</h2>}
        <div>{children}</div>
        <CloseButton onClick={onClose} className="absolute top-2 right-2 text-3xl hover:opacity-80" />
      </div>
    </div>,
    document.body,
  )
}

export default Modal
