import { useEffect } from 'react'
import { useShortcutStore, getPlatformValue, type Platform, type ShortcutDefinition } from '~/stores/shortcut-store'
import { useNavigationStore } from '~/stores/navigation-store'

type ExecutableShortcut = ShortcutDefinition & { handler: () => void }

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement
  const tagName = target.tagName
  if (['INPUT', 'TEXTAREA'].includes(tagName) || target.isContentEditable) return true
  if (target.closest?.('.monaco-editor')) return true
  return false
}

function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDefinition, platform: Platform): boolean {
  const key = getPlatformValue(shortcut.key, platform)
  if (!key || event.key.toLowerCase() !== key) return false

  const mods = getPlatformValue(shortcut.modifiers, platform) ?? {}
  const cmdOrCtrl = event.metaKey || event.ctrlKey

  if (
    (mods.cmdOrCtrl ?? false) === cmdOrCtrl &&
    (mods.shift ?? false) === event.shiftKey &&
    (mods.alt ?? false) === event.altKey
  )
    return true
  return false
}

export function useShortcutListener() {
  /**
   * Determines if a shortcut is valid for execution based on the current context.
   */
  const canExecuteShortcut = (
    shortcut: ShortcutDefinition,
    event: KeyboardEvent,
    currentRoute: string,
    platform: Platform,
    // eslint-disable-next-line unicorn/consistent-function-scoping
  ): shortcut is ExecutableShortcut => {
    if (shortcut.displayOnly || !shortcut.handler) return false

    const isGlobal = shortcut.scope === 'global'
    const isCurrentRoute = shortcut.scope === currentRoute
    if (!isGlobal && !isCurrentRoute) return false

    if (!shortcut.allowInInput && isTyping(event)) return false

    return matchesShortcut(event, shortcut, platform)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentRoute = useNavigationStore.getState().currentRoute
      const { shortcuts, platform } = useShortcutStore.getState()

      for (const shortcut of shortcuts.values()) {
        if (!canExecuteShortcut(shortcut, event, currentRoute, platform)) {
          continue
        }

        event.preventDefault()
        shortcut.handler()
        return
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [])
}
