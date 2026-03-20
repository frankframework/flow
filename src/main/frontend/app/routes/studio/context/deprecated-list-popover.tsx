import { createPortal } from 'react-dom'

export interface DeprecatedInfo {
  since?: string
  forRemoval?: boolean
  description?: string
}

export function DeprecatedListPopover({ deprecated, anchorRect }: { deprecated: DeprecatedInfo; anchorRect: DOMRect }) {
  return createPortal(
    <div
      className="bg-background text-foreground fixed z-[9999] w-64 rounded-md border border-red-400 p-3 text-xs shadow-lg transition-all"
      style={{
        top: anchorRect.top + anchorRect.height / 2,
        left: anchorRect.left - 260,
        transform: 'translateY(-50%)',
      }}
    >
      <h3 className="mb-2 font-bold text-red-600">Deprecated</h3>

      <ul className="space-y-1">
        {deprecated.since && (
          <li>
            <span className="font-semibold">Since:</span> {deprecated.since}
          </li>
        )}

        {typeof deprecated.forRemoval === 'boolean' && (
          <li>
            <span className="font-semibold">For removal:</span> {deprecated.forRemoval ? 'Yes' : 'No'}
          </li>
        )}

        {deprecated.description && (
          <li className="text-muted-foreground border-border rounded-md border p-2">{deprecated.description}</li>
        )}
      </ul>
    </div>,
    document.body,
  )
}
