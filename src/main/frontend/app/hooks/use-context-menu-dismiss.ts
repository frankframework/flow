import { useEffect, type RefObject } from 'react'

/**
 * Closes a context menu when the user clicks outside it, right-clicks outside it, or presses Escape.
 */
export function useContextMenuDismiss(menuReference: RefObject<HTMLDivElement | null>, onClose: () => void): void {
  useEffect((): (() => void) => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuReference.current && !menuReference.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('contextmenu', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuReference, onClose])
}
