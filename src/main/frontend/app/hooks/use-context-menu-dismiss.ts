import { useEffect, type RefObject } from 'react'

/**
 * Closes a context menu when the user clicks outside it, right-clicks outside it, or presses Escape.
 */
export function useContextMenuDismiss(menuRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('contextmenu', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuRef, onClose])
}
