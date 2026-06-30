import React from 'react'
import clsx from 'clsx'

type IconLabelButtonProps = {
  icon: React.ReactNode
  label: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
}

export default function IconLabelButton({ icon, label, onClick, className }: Readonly<IconLabelButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'text-foreground hover:bg-hover flex shrink-0 cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium',
        className,
      )}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}
