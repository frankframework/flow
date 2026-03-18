import { useState, type JSX } from 'react'
import {
  ALL_SHORTCUTS,
  useShortcutStore,
  formatShortcutParts,
  type Platform,
  type ShortcutDefinition,
} from '~/stores/shortcut-store'
import SwitchToggle from '~/components/inputs/switch-toggle'

const scopeLabels: Record<string, string> = {
  global: 'Global Keybinds',
  studio: 'Studio Keybinds',
  editor: 'Editor Keybinds',
  help: 'Help Keybinds',
  settings: 'Settings Keybinds',
  datamapper: 'Datamapper Keybinds',
  'code-editor': 'Code Editor Keybinds',
  'editor-file-explorer': 'Editor File Explorer Keybinds',
  'studio-file-explorer': 'Studio File Explorer Keybinds',
}

function formatKeybind(shortcut: Omit<ShortcutDefinition, 'handler'>, platform: Platform): JSX.Element {
  const parts = formatShortcutParts(shortcut, platform)

  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ' + '}
          <span className="key">{part}</span>
        </span>
      ))}
    </>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function KeybindsTable() {
  const detectedPlatform = useShortcutStore((s) => s.platform)
  const [platform, setPlatform] = useState<Platform>(detectedPlatform)

  const grouped = new Map<string, Omit<ShortcutDefinition, 'handler'>[]>()
  for (const shortcut of ALL_SHORTCUTS) {
    if (shortcut.id.endsWith('-alt')) continue

    let displayScope = shortcut.scope as string
    if (shortcut.id.startsWith('explorer.')) {
      displayScope = 'editor-file-explorer'
    } else if (shortcut.id.startsWith('studio-explorer.')) {
      displayScope = 'studio-file-explorer'
    } else if (shortcut.id.startsWith('editor.')) {
      displayScope = 'code-editor'
    }

    if (!grouped.has(displayScope)) grouped.set(displayScope, [])
    grouped.get(displayScope)?.push(shortcut)
  }

  return (
    <div className="border-border border p-4">
      <div className="flex flex-col items-center">
        <span className="mb-1 text-sm font-medium">Platform</span>
        <SwitchToggle
          options={['PC', 'Mac']}
          value={platform === 'pc' ? 'PC' : 'Mac'}
          onChange={(value) => setPlatform(value === 'PC' ? 'pc' : 'mac')}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {[...grouped.entries()].map(([scope, defs]) => (
          <div key={scope} className="mb-8">
            <h2 className="mb-2 text-center text-lg font-semibold">
              {scopeLabels[scope] ?? `${capitalize(scope)} Keybinds`}
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Keybinds</th>
                </tr>
              </thead>
              <tbody>
                {defs.map((shortcut) => (
                  <tr key={shortcut.id}>
                    <td>{shortcut.label}</td>
                    <td>{formatKeybind(shortcut, platform)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
