import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import MagnifierIcon from '/icons/solar/Magnifier.svg?react'

export default function BuilderStructure({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <div>
      <div>
        <div className="flex h-12 items-center gap-1 px-4">
          <SidebarIcon
            onClick={onClose}
            className="rotate-180 fill-gray-950 hover:fill-[var(--color-brand)]"
          ></SidebarIcon>
          <div className="text-xl">Structure</div>
        </div>
        <div className="relative px-4">
          <label htmlFor="search" className="absolute top-1/2 left-6 -translate-y-1/2">
            <MagnifierIcon className="h-auto w-4 fill-gray-400" />
          </label>
          <input
            id="search"
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-1 pr-4 pl-7"
            type="search"
            placeholder="Search"
          />
        </div>
      </div>
      <div>
        <ul>
          <li>file1</li>
          <li>file2</li>
          <li>file3</li>
          <li>file4</li>
          <li>file5</li>
          <li>file6</li>
          <li>file7</li>
          <li>file8</li>
          <li>file9</li>
          <li>file10</li>
        </ul>
      </div>
    </div>
  )
}
