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
  const isActive = location.pathname === route

  return (
    <li className="m-0 list-none p-0">
      <Link
        to={route}
        className={clsx(
          'group relative flex flex-col items-center text-center no-underline',
          isActive ? 'font-medium' : 'hover:text-[var(--color-brand)]',
        )}
      >
        {Icon && (
          <Icon className={clsx('h-8 w-auto fill-gray-950', !isActive && 'group-hover:fill-[var(--color-brand)]')} />
        )}
        <span
          className={clsx(
            'absolute top-1/2 left-full z-10 ml-2 hidden -translate-y-1/2 rounded bg-gray-950 px-2 py-1 text-sm whitespace-nowrap text-white shadow-md group-hover:block',
          )}
        >
          {label}
        </span>
        <div className={clsx('absolute top-0 right-[-1px] h-full w-[1px]', isActive && 'bg-gray-800')}></div>
      </Link>
    </li>
  )
}
