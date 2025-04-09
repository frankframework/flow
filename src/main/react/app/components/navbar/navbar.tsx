import NavbarLink from '~/components/navbar/navbar-link'
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
        <FfIcon className="h-auto w-[48px]" />
        <div className="text-xl font-bold">Flow</div>
      </div>
      <ul className="m-0 flex w-full flex-col gap-6 p-0">
        <NavbarLink route="/" label="Projects" Icon={ProjectsIcon} />
        <NavbarLink route="/builder" label="Builder" Icon={RulerCrossPenIcon} />
        <NavbarLink route="/editor" label="editor" Icon={CodeIcon} />
      </ul>
      <div className="flex-grow"></div>
      <ul className="flex w-full flex-col gap-6">
        <NavbarLink route="/help" label="Help" Icon={HelpIcon} />
        <NavbarLink route="/settings" label="Settings" Icon={SettingsIcon} />
      </ul>
    </nav>
  )
}
