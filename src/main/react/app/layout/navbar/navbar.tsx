import NavbarLink from '~/layout/navbar/navbar-link'
import './navbar.css'
import FfIcon from '/icons/ff!-icon.svg?react'
import ProjectsIcon from '/icons/solar/Widget.svg?react'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import HelpIcon from '/icons/solar/Help.svg?react'
import SettingsIcon from '/icons/solar/Settings.svg?react'

export default function Navbar() {
  return (
    <nav className="h-screen w-20 flex flex-col justify-between items-center gap-20 py-4 border-r border-gray-200 bg-white">
      <div className="w-full flex flex-col items-center">
        <div className="navigation__logo__image">
          <FfIcon className="w-[48px] h-auto" />
        </div>
        <div className="font-bold text-xl">Flow</div>
      </div>
      <ul className="w-full flex flex-col gap-6 m-0 p-0">
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
      <ul className="w-full flex flex-col gap-6">
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
