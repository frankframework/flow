import { useState, type JSX } from 'react'
import { ALL_SHORTCUTS, useShortcutStore, type Platform, type ShortcutDefinition } from '~/stores/shortcut-store'
import SwitchToggle from '~/components/inputs/switch-toggle'

const scopeLabels: Record<string, string> = {
  global: 'Global Keybinds',
  studio: 'Studio Keybinds',
  editor: 'Editor Keybinds',
  configurations: 'Configurations Keybinds',
  help: 'Help Keybinds',
  settings: 'Settings Keybinds',
  datamapper: 'Datamapper Keybinds',
}

function formatKeybind(shortcut: Omit<ShortcutDefinition, 'handler'>, platform: Platform): JSX.Element {
  const parts: string[] = []
  const mods = shortcut.modifiers ?? {}

  if (mods.cmdOrCtrl) parts.push(platform === 'mac' ? '⌘' : 'Ctrl')
  if (mods.shift) parts.push('Shift')
  if (mods.alt) parts.push(platform === 'mac' ? '⌥' : 'Alt')

  const keyLabel = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : capitalize(shortcut.key)
  parts.push(keyLabel)

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
    const scope = shortcut.scope
    if (!grouped.has(scope)) grouped.set(scope, [])
    grouped.get(scope)!.push(shortcut)
  }

  return (
    <div className="border-border border p-4">
      <div className="flex flex-col items-center">
        <span className="mb-1 text-sm font-medium">Platform</span>
        <SwitchToggle
          options={['PC', 'Mac']}
          value={platform === 'win' ? 'PC' : 'Mac'}
          onChange={(value) => setPlatform(value === 'PC' ? 'win' : 'mac')}
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
