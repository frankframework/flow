import React from 'react'
import clsx from 'clsx'

type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>

type TileViewButtonProperties = {
  isActive: boolean
  label: string
  Icon: IconComponent
  onClick: () => void
}

export function ActiveIconButton({
  isActive,
  label,
  Icon,
  onClick,
}: Readonly<TileViewButtonProperties>): React.JSX.Element {
  return (
    <li className="m-0 list-none p-0">
      <button
        type="button"
        onClick={onClick}
        className="group relative flex w-full cursor-pointer flex-col items-center py-1"
      >
        <div
          className={clsx('absolute bottom-1 left-1/2 h-0.5 w-10/12 -translate-x-1/2 rounded', isActive && 'bg-brand')}
        />
        <div className="hover:bg-hover rounded p-2">
          <Icon
            className={clsx(
              'h-8 w-auto',
              isActive ? 'fill-brand' : 'fill-foreground-muted group-hover:fill-foreground',
            )}
          />
        </div>
        <span className="bg-backdrop text-foreground border-border absolute top-full left-1/2 z-10 mt-2 hidden -translate-x-1/2 rounded border px-2 py-1 text-sm whitespace-nowrap shadow-md group-hover:block">
          {label}
        </span>
      </button>
    </li>
  )
}
