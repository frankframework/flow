import NavbarLink from '~/components/navbar/navbar-link'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import ProjectsIcon from '/icons/solar/Widget.svg?react'
import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import HelpIcon from '/icons/solar/Help.svg?react'
import SettingsIcon from '/icons/solar/Settings.svg?react'

export default function Navbar() {
  return (
    <nav className="border-border flex h-screen w-20 flex-col items-center justify-between gap-20 border-r py-4">
      <div className="flex w-full flex-col items-center">
        <FfIcon className="h-auto w-[48px]" />
        <div className="text-xl font-bold">Flow</div>
      </div>
      <ul className="flex w-full flex-col">
        <NavbarLink route="configurations" label="Overview" Icon={ProjectsIcon} />
        <NavbarLink route="studio" label="Studio" Icon={RulerCrossPenIcon} />
        <NavbarLink route="editor" label="Editor" Icon={CodeIcon} />
      </ul>
      <div className="flex-grow"></div>
      <ul className="flex w-full flex-col">
        <NavbarLink route="help" label="Help" Icon={HelpIcon} />
        <NavbarLink route="settings" label="Settings" Icon={SettingsIcon} />
      </ul>
    </nav>
  )
}
