import clsx from 'clsx'

interface RoundedToggleProperties {
  label: string
  enabled?: boolean
  onClick?: () => void
  className?: string
}

export default function RoundedToggle({
  label,
  enabled = true,
  onClick,
  className,
}: Readonly<RoundedToggleProperties>) {
  return (
    <span
      onClick={onClick}
      className={clsx(
        'cursor-pointer rounded-full border px-3 py-1 text-sm font-medium select-none',
        enabled
          ? 'border-foreground-active hover:bg-foreground-active' // active
          : 'border-border/30 text-foreground/30 hover:border-border', // disabled/faded
        className,
      )}
    >
      {label}
    </span>
  )
}
