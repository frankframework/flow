import { useEffect, useRef } from 'react'
import { matchPath, useLocation } from 'react-router'
import { getPlatformValue, type Platform, type ShortcutDefinition, useShortcutStore } from '~/stores/shortcut-store'

type ExecutableShortcut = ShortcutDefinition & { handler: () => void }

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement
  const tagName = target.tagName
  if (['INPUT', 'TEXTAREA'].includes(tagName) || target.isContentEditable) return true
  return !!target.closest?.('.monaco-editor')
}

function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDefinition, platform: Platform): boolean {
  const key = getPlatformValue(shortcut.key, platform)
  if (!key || event.key.toLowerCase() !== key) return false

  const mods = getPlatformValue(shortcut.modifiers, platform) ?? {}
  const cmdOrCtrl = event.metaKey || event.ctrlKey

  return (
    (mods.cmdOrCtrl ?? false) === cmdOrCtrl &&
    (mods.shift ?? false) === event.shiftKey &&
    (mods.alt ?? false) === event.altKey
  )
}

function canExecuteShortcut(
  shortcut: ShortcutDefinition,
  pathname: string,
  event: KeyboardEvent,
  platform: Platform,
): shortcut is ExecutableShortcut {
  if (shortcut.displayOnly || !shortcut.handler) return false

  const isGlobal = shortcut.scope === 'global'
  const isCurrentRoute = matchPath(shortcut.scope, pathname)
  if (!isGlobal && !isCurrentRoute) return false

  if (!shortcut.allowInInput && isTyping(event)) return false

  return matchesShortcut(event, shortcut, platform)
}

export function useShortcutListener() {
  const location = useLocation()

  const pathnameRef = useRef(location.pathname)
  const shortcutsRef = useRef(useShortcutStore.getState().shortcuts)
  const platformRef = useRef(useShortcutStore.getState().platform)

  useEffect(() => {
    return useShortcutStore.subscribe((state) => {
      shortcutsRef.current = state.shortcuts
      platformRef.current = state.platform
    })
  }, [])

  useEffect(() => {
    pathnameRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const pathname = pathnameRef.current
      const shortcuts = shortcutsRef.current
      const platform = platformRef.current

      for (const shortcut of shortcuts.values()) {
        if (!canExecuteShortcut(shortcut, pathname, event, platform)) {
          continue
        }

        const result = shortcut.handler()
        if (result !== false) {
          event.preventDefault()
          return
        }
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [])
}
