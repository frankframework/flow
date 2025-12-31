export interface DeprecatedInfo {
  since?: string
  forRemoval?: boolean
  description?: string
}

export function DeprecatedListPopover({ deprecated }: { deprecated: DeprecatedInfo }) {
  return (
    <div className="bg-background text-foreground pointer-events-none absolute top-1/2 right-10 ml-2 w-64 -translate-y-1/2 scale-95 rounded-md border border-red-400 p-3 text-xs opacity-0 shadow-lg transition-all group-hover:scale-100 group-hover:opacity-100">
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
    </div>
  )
}
