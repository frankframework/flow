import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '~/components/inputs/button'
import ValidatedInput from '~/components/inputs/validatedInput'

const BASE_NAME_PATTERNS: Record<string, RegExp> = {
  'Cannot be empty': /^(?!\s*$).+/,
  'Cannot contain /': /^[^/]*$/,
  'Cannot contain \\': /^[^\\]*$/,
  'Cannot contain ..': /^(?!.*\.\.).*$/,
}

export const FILE_NAME_PATTERNS: Record<string, RegExp> = {
  ...BASE_NAME_PATTERNS,
  'Must end with:\n.xml, .json, .yaml, .yml, or .properties': /^(.*\.(xml|json|yaml|yml|properties))?$/i,
}

export const CONFIGURATION_NAME_PATTERNS: Record<string, RegExp> = {
  ...BASE_NAME_PATTERNS,
  'Must end with:\n.xml': /^(.*\.(xml))?$/i,
}

export const FOLDER_OR_ADAPTER_NAME_PATTERNS: Record<string, RegExp> = BASE_NAME_PATTERNS

type NameInputDialogProps = {
  title: string
  initialValue?: string
  submitLabel?: string
  onSubmit: (name: string) => void
  onCancel: () => void
  patterns?: Record<string, RegExp>
}

export default function NameInputDialog({
  title,
  initialValue = '',
  submitLabel = 'OK',
  onSubmit,
  onCancel,
  patterns = FOLDER_OR_ADAPTER_NAME_PATTERNS,
}: NameInputDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [isValid, setIsValid] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit(value.trim())
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === overlayRef.current) onCancel()
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30"
      onClick={handleOverlayClick}
    >
      <div className="bg-background border-border w-80 rounded-md border p-4 shadow-lg">
        <p className="text-foreground mb-2 text-sm font-medium">{title}</p>
        <ValidatedInput
          autoFocus
          onFocus={(event) => event.target.select()}
          value={value}
          patterns={patterns}
          onValidChange={setIsValid}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button onClick={onCancel} className="px-3 py-1 text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="px-3 py-1 text-sm">
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
