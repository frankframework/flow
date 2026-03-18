import React from 'react'

export interface HandleMenuItemProperties {
  label: string
  iconColor?: string
  onClick: () => void
  isLast?: boolean
}

const HandleMenuItem: React.FC<HandleMenuItemProperties> = ({ label, iconColor: color, onClick, isLast = false }) => {
  return (
    <li
      className={`hover:bg-border border-border flex h-10 cursor-pointer items-center justify-between p-2 ${
        isLast ? '' : 'border-b'
      }`}
      onClick={onClick}
    >
      <span>{label}</span>
      {color && <div className="mx-2 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
    </li>
  )
}

export default HandleMenuItem
