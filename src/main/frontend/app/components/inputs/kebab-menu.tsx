import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import KebabIcon from '/icons/solar/Kebab Vertical.svg?react'

export type KebabMenuItem = {
  label: string
  icon?: ReactNode
  onClick: () => void
  className?: string
}

type KebabMenuProperties = {
  items: KebabMenuItem[]
  triggerClassName?: string
}

export default function KebabMenu({ items, triggerClassName }: Readonly<KebabMenuProperties>): JSX.Element {
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const triggerReference = useRef<HTMLButtonElement>(null)
  const menuReference = useRef<HTMLDivElement>(null)

  useEffect((): (() => void) | undefined => {
    if (!menuPosition) return

    const handleMouseDown = (event: MouseEvent): void => {
      const clickedTrigger = triggerReference.current?.contains(event.target as Node)
      const clickedMenu = menuReference.current?.contains(event.target as Node)
      if (!clickedTrigger && !clickedMenu) setMenuPosition(null)
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuPosition(null)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuPosition])

  const openMenu = (event: React.MouseEvent): void => {
    event.stopPropagation()
    if (menuPosition) {
      setMenuPosition(null)
      return
    }
    const rect = triggerReference.current?.getBoundingClientRect()
    if (rect) setMenuPosition({ x: rect.right, y: rect.bottom })
  }

  return (
    <>
      <button
        ref={triggerReference}
        onClick={openMenu}
        className={clsx(
          'icon-button text-foreground-muted hover:bg-hover hover:text-foreground cursor-pointer rounded p-1',
          triggerClassName,
        )}
        aria-label="More options"
      >
        <KebabIcon className="h-4 w-4 fill-current" />
      </button>

      {menuPosition &&
        createPortal(
          <div
            ref={menuReference}
            className="bg-background border-border fixed z-50 min-w-max rounded-md border p-1 shadow-md"
            style={{ top: menuPosition.y, right: `calc(100vw - ${menuPosition.x}px)` }}
          >
            {items.map((item): JSX.Element => (
              <button
                key={item.label}
                onClick={(event): void => {
                  event.stopPropagation()
                  item.onClick()
                  setMenuPosition(null)
                }}
                className={clsx(
                  'text-foreground hover:bg-hover flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap',
                  item.className,
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
