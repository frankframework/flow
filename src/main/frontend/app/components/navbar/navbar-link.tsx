import clsx from 'clsx'
import { type AppRoute, useNavigationStore } from '~/stores/navigation-store'

interface NavbarLinkProperties {
  route: AppRoute
  label: string
  Icon?: React.FC<React.SVGProps<SVGSVGElement>>
}

export default function NavbarLink({ route, label, Icon }: Readonly<NavbarLinkProperties>) {
  const currentRoute = useNavigationStore((state) => state.currentRoute)
  const navigate = useNavigationStore((state) => state.navigate)
  const isActive = currentRoute === route

  const handleClick = () => {
    navigate(route)
  }

  return (
    <li className="m-0 list-none p-0">
      <button
        type="button"
        onClick={handleClick}
        className="group hover:bg-hover relative flex w-full flex-col items-center p-4 text-center hover:cursor-pointer"
      >
        <div
          className={clsx('absolute top-1/2 left-1 h-10/12 w-[2px] -translate-y-1/2 rounded', isActive && 'bg-brand')}
        />
        {Icon && (
          <Icon className={clsx('group-hover:fill-brand h-8 w-auto', isActive ? 'fill-brand' : 'fill-foreground')} />
        )}
        <span
          className={clsx(
            'absolute top-1/2 left-full z-10 ml-2 hidden -translate-y-1/2 rounded bg-neutral-950 px-2 py-1 text-sm whitespace-nowrap text-white shadow-md group-hover:block',
          )}
        >
          {label}
        </span>
      </button>
    </li>
  )
}
