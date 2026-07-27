import type { JSX, ReactNode } from 'react'
import Button from '~/components/inputs/button'

type ContextEditorFooterProperties = {
  onSave: () => void
  onDelete: () => void
  saveDisabled?: boolean
  deleteDisabled?: boolean
  saveLabel?: string
  deleteLabel?: string
  errorMessage?: string
  leadingActions?: ReactNode
}

export default function ContextEditorFooter({
  onSave,
  onDelete,
  saveDisabled = false,
  deleteDisabled = false,
  saveLabel = 'Save & Close',
  deleteLabel = 'Delete',
  errorMessage,
  leadingActions,
}: Readonly<ContextEditorFooterProperties>): JSX.Element {
  return (
    <div className="border-t-border bg-background border-t p-4">
      <div className="flex w-full items-center justify-between">
        <Button
          onClick={onSave}
          disabled={saveDisabled}
          className="disabled:text-foreground-muted w-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveLabel}
        </Button>

        <div className="flex items-center gap-2">
          {leadingActions}
          <Button className="w-auto" onClick={onDelete} disabled={deleteDisabled}>
            {deleteLabel}
          </Button>
        </div>
      </div>

      {errorMessage && <p className="text-error mt-2 text-sm">{errorMessage}</p>}
    </div>
  )
}
