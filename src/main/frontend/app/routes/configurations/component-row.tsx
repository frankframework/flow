import { type ReactNode } from 'react'
import Button from '~/components/inputs/button'

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
}: Readonly<ComponentRowProperties>) {
  return (
    <li className="border-border bg-background hover:bg-hover flex items-stretch justify-between gap-2 rounded border shadow-md transition-colors">
      <Button
        variant="unstyled"
        type="button"
        onClick={onConfigure}
        className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 px-4 py-3 text-left"
        title={`Configure ${primaryLabel}`}
      >
        {typeLabel && (
          <span className="text-foreground-muted truncate text-xs font-bold tracking-wider uppercase">{typeLabel}</span>
        )}
        <span className="text-foreground truncate text-base" title={primaryLabel}>
          {primaryLabel}
        </span>
      </Button>
      {action && <div className="flex shrink-0 items-center pr-2">{action}</div>}
    </li>
  )
}
