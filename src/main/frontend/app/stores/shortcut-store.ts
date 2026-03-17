import { create } from 'zustand'
import type { AppRoute } from '~/stores/navigation-store'

export interface ShortcutDefinition {
  id: string
  label: string
  scope: AppRoute | 'global'
  key: string
  modifiers?: { cmdOrCtrl?: boolean; shift?: boolean; alt?: boolean }
  allowInInput?: boolean
  displayOnly?: boolean
  handler?: () => void
}

export type Platform = 'mac' | 'win'

function detectPlatform(): Platform {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)) {
    return 'mac'
  }
  return 'win'
}

/**
 * Static registry of all shortcut definitions (without handlers).
 * Always available for the keybinds help table regardless of which components are mounted.
 */
export const ALL_SHORTCUTS: Omit<ShortcutDefinition, 'handler'>[] = [
  // Studio
  { id: 'studio.copy', label: 'Copy Selection', scope: 'studio', key: 'c', modifiers: { cmdOrCtrl: true } },
  { id: 'studio.paste', label: 'Paste Selection', scope: 'studio', key: 'v', modifiers: { cmdOrCtrl: true } },
  { id: 'studio.undo', label: 'Undo', scope: 'studio', key: 'z', modifiers: { cmdOrCtrl: true } },
  { id: 'studio.redo', label: 'Redo', scope: 'studio', key: 'z', modifiers: { cmdOrCtrl: true, shift: true } },
  { id: 'studio.redo-alt', label: 'Redo', scope: 'studio', key: 'y', modifiers: { cmdOrCtrl: true } },
  { id: 'studio.group', label: 'Group Selection', scope: 'studio', key: 'g' },
  { id: 'studio.save', label: 'Save Changes', scope: 'studio', key: 's', modifiers: { cmdOrCtrl: true } },
  {
    id: 'studio.close-context',
    label: 'Discard / Close Edit Panel',
    scope: 'studio',
    key: 'escape',
    allowInInput: true,
  },
  { id: 'studio.delete', label: 'Delete Selection', scope: 'studio', key: 'delete', displayOnly: true },
  {
    id: 'studio.save-node',
    label: 'Save Node',
    scope: 'studio',
    key: 'enter',
    modifiers: { cmdOrCtrl: true },
    allowInInput: true,
  },

  // Editor
  { id: 'editor.save', label: 'Save Changes', scope: 'editor', key: 's', modifiers: { cmdOrCtrl: true }, displayOnly: true },
  {
    id: 'editor.normalize',
    label: 'Normalize Frank Elements',
    scope: 'editor',
    key: 'f',
    modifiers: { cmdOrCtrl: true, shift: true },
    displayOnly: true,
  },
]

function buildInitialShortcuts(): Map<string, ShortcutDefinition> {
  const map = new Map<string, ShortcutDefinition>()
  for (const def of ALL_SHORTCUTS) {
    map.set(def.id, { ...def })
  }
  return map
}

interface ShortcutState {
  platform: Platform
  shortcuts: Map<string, ShortcutDefinition>
  setHandler: (id: string, handler: (() => void) | undefined) => void
}

export const useShortcutStore = create<ShortcutState>((set) => ({
  platform: detectPlatform(),
  shortcuts: buildInitialShortcuts(),
  setHandler: (id, handler) =>
    set((state) => {
      const existing = state.shortcuts.get(id)
      if (!existing) return state
      const next = new Map(state.shortcuts)
      next.set(id, { ...existing, handler })
      return { shortcuts: next }
    }),
}))
