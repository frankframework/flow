import clsx from 'clsx'
import React from 'react'
import { useMatch, useNavigate } from 'react-router'

interface NavbarLinkProperties {
  route: string
  label: string
  Icon?: React.FC<React.SVGProps<SVGSVGElement>>
}

export default function NavbarLink({ route, label, Icon }: Readonly<NavbarLinkProperties>) {
  const navigate = useNavigate()
  const isActive = useMatch(route)

  return (
    <li className="m-0 list-none p-0">
      <button
        type="button"
        onClick={() => navigate(route)}
        className="group relative flex w-full cursor-pointer flex-col items-center py-1"
      >
        <div
          className={clsx('absolute top-1/2 left-1 h-10/12 w-0.5 -translate-y-1/2 rounded', isActive && 'bg-brand')}
        />
        <div className="hover:bg-hover rounded p-2">
          {Icon && (
            <Icon
              className={clsx(
                'h-8 w-auto',
                isActive ? 'fill-brand' : 'fill-foreground-muted group-hover:fill-foreground',
              )}
            />
          )}
        </div>
        <span className="bg-backdrop text-foreground border-border absolute top-1/2 left-full z-10 ml-2 hidden -translate-y-1/2 rounded border px-2 py-1 text-sm whitespace-nowrap shadow-md group-hover:block">
          {label}
        </span>
      </button>
    </li>
  )
}
