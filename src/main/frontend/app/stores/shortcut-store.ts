import { create } from 'zustand'
import type { AppRoute } from '~/stores/navigation-store'

export type Platform = 'mac' | 'pc'

type PlatformValue<T> = T | Partial<Record<Platform, T>>

export interface KeyModifiers {
  cmdOrCtrl?: boolean
  shift?: boolean
  alt?: boolean
}

export interface ShortcutDefinition {
  id: string
  label: string
  scope: AppRoute | 'global'
  key: PlatformValue<string>
  modifiers?: PlatformValue<KeyModifiers>
  allowInInput?: boolean
  displayOnly?: boolean
  handler?: () => void
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function getPlatformValue<T>(value: PlatformValue<T> | undefined, platform: Platform): T | undefined {
  if (value === undefined) return undefined

  if (typeof value === 'object' && value !== null && ('mac' in value || 'pc' in value)) {
    return (value as Record<Platform, T>)[platform]
  }

  return value as T
}

/**
 * Builds the display parts for a shortcut's key combination (e.g. ['Ctrl', 'Shift', 'F']).
 */
export function formatShortcutParts(shortcut: ShortcutDefinition, platform: Platform): string[] {
  const parts: string[] = []

  const activeKey = getPlatformValue(shortcut.key, platform) || ''
  const mods = getPlatformValue(shortcut.modifiers, platform) ?? {}

  if (mods.cmdOrCtrl) parts.push(platform === 'mac' ? '⌘' : 'Ctrl')
  if (mods.shift) parts.push('Shift')
  if (mods.alt) parts.push(platform === 'mac' ? '⌥' : 'Alt')

  const keyLabel = activeKey.length === 1 ? activeKey.toUpperCase() : capitalize(activeKey)
  parts.push(keyLabel)

  return parts
}

function detectPlatform(): Platform {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)) {
    return 'mac'
  }
  return 'pc'
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
  { id: 'studio.cut', label: 'Cut Selection', scope: 'studio', key: 'x', modifiers: { cmdOrCtrl: true } },
  { id: 'studio.group', label: 'Group Selection', scope: 'studio', key: 'g' },
  { id: 'studio.ungroup', label: 'Ungroup Selection', scope: 'studio', key: 'g', modifiers: { shift: true } },
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
  {
    id: 'editor.save',
    label: 'Save Changes',
    scope: 'editor',
    key: 's',
    modifiers: { cmdOrCtrl: true },
    displayOnly: true,
  },
  {
    id: 'editor.normalize',
    label: 'Normalize Frank Elements',
    scope: 'editor',
    key: 'f',
    modifiers: { cmdOrCtrl: true, shift: true },
    displayOnly: true,
  },
  {
    id: 'editor.reformat',
    label: 'Reformat XML',
    scope: 'editor',
    key: 'f',
    modifiers: { alt: true, shift: true },
    displayOnly: true,
  },
  { id: 'editor.search', label: 'Find', scope: 'editor', key: 'f', modifiers: { cmdOrCtrl: true }, displayOnly: true },
  {
    id: 'editor.replace',
    label: 'Find and Replace',
    scope: 'editor',
    key: 'h',
    modifiers: { cmdOrCtrl: true },
    displayOnly: true,
  },
  { id: 'editor.copy', label: 'Copy', scope: 'editor', key: 'c', modifiers: { cmdOrCtrl: true }, displayOnly: true },
  { id: 'editor.cut', label: 'Cut', scope: 'editor', key: 'x', modifiers: { cmdOrCtrl: true }, displayOnly: true },
  { id: 'editor.paste', label: 'Paste', scope: 'editor', key: 'v', modifiers: { cmdOrCtrl: true }, displayOnly: true },
  { id: 'editor.undo', label: 'Undo', scope: 'editor', key: 'z', modifiers: { cmdOrCtrl: true }, displayOnly: true },
  {
    id: 'editor.redo',
    label: 'Redo',
    scope: 'editor',
    key: 'z',
    modifiers: { cmdOrCtrl: true, shift: true },
    displayOnly: true,
  },
  {
    id: 'editor.select-all',
    label: 'Select All',
    scope: 'editor',
    key: 'a',
    modifiers: { cmdOrCtrl: true },
    displayOnly: true,
  },
  { id: 'editor.command-palette', label: 'Command Palette', scope: 'editor', key: 'f1', displayOnly: true },
  {
    id: 'editor.go-to-line',
    label: 'Go to Line',
    scope: 'editor',
    key: 'g',
    modifiers: { cmdOrCtrl: true },
    displayOnly: true,
  },
  {
    id: 'editor.toggle-comment',
    label: 'Toggle Comment',
    scope: 'editor',
    key: '/',
    modifiers: { cmdOrCtrl: true },
    displayOnly: true,
  },

  // Editor File Explorer
  { id: 'explorer.new-file', label: 'New File', scope: 'editor', key: 'n' },
  { id: 'explorer.new-folder', label: 'New Folder', scope: 'editor', key: 'n', modifiers: { shift: true } },
  { id: 'explorer.rename', label: 'Rename Item', scope: 'editor', key: 'r' },
  {
    id: 'explorer.delete',
    label: 'Delete Item',
    scope: 'editor',
    key: { pc: 'delete', mac: 'backspace' },
    modifiers: { mac: { cmdOrCtrl: true } },
  },

  // Studio File Explorer
  { id: 'studio-explorer.new-config', label: 'New Configuration', scope: 'studio', key: 'c' },
  { id: 'studio-explorer.new-adapter', label: 'New Adapter', scope: 'studio', key: 'a' },
  { id: 'studio-explorer.new-folder', label: 'New Folder', scope: 'studio', key: 'n', modifiers: { shift: true } },
  { id: 'studio-explorer.rename', label: 'Rename Item', scope: 'studio', key: 'r' },
  {
    id: 'studio-explorer.delete',
    label: 'Delete Item',
    scope: 'studio',
    key: { pc: 'delete', mac: 'backspace' },
    modifiers: { mac: { cmdOrCtrl: true } },
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
