import { Link, useLocation } from 'react-router'
import React from 'react'
import clsx from 'clsx'

interface NavbarLinkProperties {
  route: string
  children: React.ReactNode
}

export default function NavbarLink({ route, children }: Readonly<NavbarLinkProperties>) {
  const location = useLocation()
  const isActive = location.pathname === route

  return (
    <li className="m-0 list-none p-0">
      <Link
        to={route}
        className={clsx(
          'group relative flex flex-col items-center text-center no-underline hover:text-[var(--color-brand)]',
          isActive && 'font-medium',
        )}
      >
        {children}
        <div className={clsx('absolute top-0 right-[-1px] h-full w-[1px]', isActive && 'bg-gray-800')}></div>
      </Link>
    </li>
  )
}
