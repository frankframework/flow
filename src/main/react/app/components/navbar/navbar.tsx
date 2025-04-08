import NavbarLink from '~/components/navbar/navbar-link'
import './navbar.css'
import FfIcon from '/icons/ff!-icon.svg?react'
import ProjectsIcon from '/icons/solar/Widget.svg?react'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import HelpIcon from '/icons/solar/Help.svg?react'
import SettingsIcon from '/icons/solar/Settings.svg?react'

export default function Navbar() {
  return (
    <nav className="flex h-screen w-20 flex-col items-center justify-between gap-20 border-r border-gray-200 bg-white py-4">
      <div className="flex w-full flex-col items-center">
        <div className="navigation__logo__image">
          <FfIcon className="h-auto w-[48px]" />
        </div>
        <div className="text-xl font-bold">Flow</div>
      </div>
      <ul className="m-0 flex w-full flex-col gap-6 p-0">
        <NavbarLink route="/">
          <ProjectsIcon className="navbar-link-icon" />
          Projects
        </NavbarLink>
        <NavbarLink route="/builder">
          <RulerCrossPenIcon className="navbar-link-icon" />
          Builder
        </NavbarLink>
        <NavbarLink route="/editor">
          <CodeIcon className="navbar-link-icon" />
          Editor
        </NavbarLink>
      </ul>
      <div className="flex-grow"></div>
      <ul className="flex w-full flex-col gap-6">
        <NavbarLink route="/help">
          <HelpIcon className="navbar-link-icon" />
          Help
        </NavbarLink>
        <NavbarLink route="/settings">
          <SettingsIcon className="navbar-link-icon" />
          Settings
        </NavbarLink>
      </ul>
    </nav>
  )
}
