import { useState, type JSX } from 'react'
import {
  ALL_SHORTCUTS,
  useShortcutStore,
  formatShortcutParts,
  type Platform,
  type ShortcutDefinition,
} from '~/stores/shortcut-store'
import SwitchToggle from '~/components/inputs/switch-toggle'

const SCOPE_PREFIXES = [
  { prefix: 'studio-explorer.', scope: 'studio-file-explorer' },
  { prefix: 'explorer.', scope: 'editor-file-explorer' },
  { prefix: 'editor.', scope: 'code-editor' },
] as const

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

    const match = SCOPE_PREFIXES.find((prefix) => shortcut.id.startsWith(prefix.prefix))
    const displayScope = match ? match.scope : (shortcut.scope as string)

    if (!grouped.has(displayScope)) grouped.set(displayScope, [])
    grouped.get(displayScope)?.push(shortcut)
  }

  return (
    <div className="p-4">
      <div className="mb-5 flex flex-col items-center">
        <span className="mb-1 text-sm font-medium">Platform</span>
        <SwitchToggle
          options={['PC', 'Mac']}
          value={platform === 'pc' ? 'PC' : 'Mac'}
          onChange={(value) => setPlatform(value === 'PC' ? 'pc' : 'mac')}
        />
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2">
        {[...grouped.entries()].map(([scope, defs]) => (
          <div key={scope} className="border-border overflow-hidden rounded-md border">
            <h3 className="text-center">{scopeLabels[scope] ?? `${capitalize(scope)} Keybinds`}</h3>
            <div className="border-b-border bg-backdrop flex border-b font-bold">
              <div className="border-r-border flex-1 border-r px-[13px] py-[6px] text-sm">Action</div>
              <div className="flex-1 px-[13px] py-[6px] text-sm">Keybinds</div>
            </div>
            {defs.map((shortcut, i) => (
              <div
                key={shortcut.id}
                className={`border-b-border flex border-b last:border-b-0 ${i % 2 === 1 ? 'bg-backdrop' : 'bg-background'}`}
              >
                <div className="border-r-border flex-1 border-r px-[13px] py-[6px] text-sm">{shortcut.label}</div>
                <div className="flex-1 px-[13px] py-[6px] text-sm">{formatKeybind(shortcut, platform)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
