import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSubmitOnEnter } from '~/hooks/use-submit-on-enter'
import Button from '~/components/inputs/button'
import ValidatedInput from '~/components/inputs/validatedInput'
import { SAFE_NAME_PATTERN } from '~/utils/path-utils'

const BASE_NAME_PATTERNS: Record<string, RegExp> = {
  'Cannot be empty': /^(?!\s*$).+/,
  'Cannot contain ..': /^(?!.*\.\.).*$/,
  'Only letters, digits, spaces, and . _ - allowed': SAFE_NAME_PATTERN,
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

export const PROJECT_NAME_PATTERNS: Record<string, RegExp> = {
  ...BASE_NAME_PATTERNS,
  'Cannot have a file extension': /^(?!.*\.[^.\\/]+$).*$/,
}

type NameInputDialogProperties = {
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
}: NameInputDialogProperties) {
  const [value, setValue] = useState(initialValue)
  const [isValid, setIsValid] = useState(false)
  const overlayReference = useRef<HTMLDivElement>(null)

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit(value.trim())
  }

  useSubmitOnEnter(handleSubmit)

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return
    }

    event.preventDefault()
    onCancel()
  }

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === overlayReference.current) onCancel()
  }

  return createPortal(
    <div
      ref={overlayReference}
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
