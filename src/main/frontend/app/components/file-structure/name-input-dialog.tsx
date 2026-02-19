import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '~/components/inputs/button'

interface NameInputDialogProps {
  title: string
  initialValue?: string
  onSubmit: (name: string) => void
  onCancel: () => void
}

function validateName(name: string): string | null {
  if (!name || name.trim() === '') return 'Name cannot be empty'
  if (name.includes('/')) return 'Name cannot contain /'
  if (name.includes('\\')) return 'Name cannot contain \\'
  if (name.includes('..')) return 'Name cannot contain ..'
  return null
}

export default function NameInputDialog({ title, initialValue = '', onSubmit, onCancel }: NameInputDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = () => {
    const err = validateName(value)
    if (err) {
      setError(err)
      return
    }
    onSubmit(value.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

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
        <p className="text-foreground mb-2 text-sm font-medium">{title}</p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          className="bg-background border-border text-foreground w-full rounded-md border px-2 py-1 text-sm focus:outline-none"
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <Button onClick={onCancel} className="px-3 py-1 text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="px-3 py-1 text-sm">
            OK
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
