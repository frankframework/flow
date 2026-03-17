import { useEffect } from 'react'
import { useShortcutStore, type ShortcutDefinition } from '~/stores/shortcut-store'
import { useNavigationStore } from '~/stores/navigation-store'

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement
  const tagName = target.tagName
  if (['INPUT', 'TEXTAREA'].includes(tagName) || target.isContentEditable) return true
  if (target.closest?.('.monaco-editor')) return true
  return false
}

function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDefinition): boolean {
  if (event.key.toLowerCase() !== shortcut.key) return false

  const mods = shortcut.modifiers ?? {}
  const cmdOrCtrl = event.metaKey || event.ctrlKey

  if (
    mods.cmdOrCtrl === cmdOrCtrl && 
    mods.shift === event.shiftKey && 
    mods.alt === event.altKey
  ) return true
  return false
}

export function useShortcutListener() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentRoute = useNavigationStore.getState().currentRoute
      const { shortcuts } = useShortcutStore.getState()

      for (const shortcut of shortcuts.values()) {
        if (
          shortcut.displayOnly ||
          !shortcut.handler ||
          (shortcut.scope !== 'global' && shortcut.scope !== currentRoute) ||
          !matchesShortcut(event, shortcut) ||
          !shortcut.allowInInput && isTyping(event)
        ) continue

        event.preventDefault()
        shortcut.handler()
        return
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [])
}
