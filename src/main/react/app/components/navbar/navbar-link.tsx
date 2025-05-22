import { Link, useLocation } from 'react-router'
import React from 'react'
import clsx from 'clsx'

interface NavbarLinkProperties {
  route: string
  label: string
  Icon?: React.FC<React.SVGProps<SVGSVGElement>>
}

export default function NavbarLink({ route, label, Icon }: Readonly<NavbarLinkProperties>) {
  const location = useLocation()
  const isActive = location.pathname === route || (route !== '/' && location.pathname.startsWith(route))

  return (
    <li className="m-0 list-none p-0">
      <Link
        to={route}
        className={clsx('group hover:bg-hover relative flex flex-col items-center p-4 text-center no-underline')}
      >
        <div
          className={clsx('absolute top-1/2 left-1 h-10/12 w-[2px] -translate-y-1/2 rounded', isActive && 'bg-brand')}
        ></div>
        {Icon && (
          <Icon className={clsx('group-hover:fill-brand h-8 w-auto', isActive ? 'fill-brand' : 'fill-foreground')} />
        )}
        <span
          className={clsx(
            'bg-foreground text-background absolute top-1/2 left-full z-10 ml-2 hidden -translate-y-1/2 rounded px-2 py-1 text-sm whitespace-nowrap shadow-md group-hover:block',
          )}
        >
          {label}
        </span>
      </Link>
    </li>
  )
}
