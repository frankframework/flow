import { useEffect, type RefObject } from 'react'

/**
 * Closes a context menu when the user clicks outside it or presses Escape.
 */
export function useContextMenuDismiss(menuRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuRef, onClose])
}
