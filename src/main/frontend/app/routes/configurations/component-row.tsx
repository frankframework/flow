import type { JSX, ReactNode } from 'react'

type ComponentRowProperties = {
  typeLabel: string | null
  primaryLabel: string
  onConfigure: () => void
  action?: ReactNode
}

export default function ComponentRow({
  typeLabel,
  primaryLabel,
  onConfigure,
  action,
}: Readonly<ComponentRowProperties>): JSX.Element {
  return (
    <span className="flex w-full items-stretch gap-2 transition-colors">
      <span
        onClick={onConfigure}
        className="hover:bg-hover flex min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 rounded px-4 py-3 text-left"
        title={`Configure ${primaryLabel}`}
      >
        {typeLabel && (
          <span className="text-foreground-muted truncate text-xs font-bold tracking-wider uppercase">{typeLabel}</span>
        )}
        <span className="text-foreground truncate text-base" title={primaryLabel}>
          {primaryLabel}
        </span>
      </span>
      {action && <div className="flex shrink-0 items-center">{action}</div>}
    </span>
  )
}
