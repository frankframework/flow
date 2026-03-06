import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '~/components/inputs/button'
import ValidatedInput from '~/components/inputs/validatedInput'

const namePatterns: Record<string, RegExp> = {
  'Cannot be empty': /^(?!\s*$).+/,
  'Cannot contain /': /^[^/]*$/,
  'Cannot contain \\': /^[^\\]*$/,
  'Cannot contain ..': /^(?!.*\.\.).*$/,
}

interface NameInputDialogProps {
  title: string
  initialValue?: string
  onSubmit: (name: string) => void
  onCancel: () => void
}

export default function NameInputDialog({ title, initialValue = '', onSubmit, onCancel }: NameInputDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [isValid, setIsValid] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleSubmit = () => {
    if (!isValid) return
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
        <ValidatedInput
          autoFocus
          onFocus={(e) => e.target.select()}
          value={value}
          patterns={namePatterns}
          onValidChange={setIsValid}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button onClick={onCancel} className="px-3 py-1 text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="px-3 py-1 text-sm">
            OK
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
