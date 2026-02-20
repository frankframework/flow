import { useState, type JSX } from 'react'
import SwitchToggle from '~/components/inputs/switch-toggle'

export function KeybindsTable() {
  const [platform, setPlatform] = useState<'win' | 'mac'>('win')

  const renderTable = (title: string, rows: { action: string; keybind: JSX.Element }[]) => (
    <div className="mb-8">
      <h2 className="mb-2 text-center text-lg font-semibold">{title}</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th>Action</th>
            <th>Keybinds</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td>{row.action}</td>
              <td>{row.keybind}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // Studio keybinds
  const studioRows = [
    {
      action: 'Save Changes',
      keybind:
        platform === 'win' ? (
          <>
            <span className="key">Ctrl</span> + <span className="key">S</span>
          </>
        ) : (
          <>
            <span className="key">⌘</span> + <span className="key">S</span>
          </>
        ),
    },
    {
      action: 'Delete Selection',
      keybind: (
        <>
          <span className="key">Backspace</span> / <span className="key">Delete</span>
        </>
      ),
    },
    {
      action: 'Edit Node',
      keybind: <span className="key">Double-click</span>,
    },
    {
      action: 'Add Sticky Note',
      keybind: <span className="key">Right-click</span>,
    },
    {
      action: 'Drag Select',
      keybind: (
        <>
          <span className="key">Shift</span> + <span className="key">Click</span>
        </>
      ),
    },
    {
      action: 'Multi-Select',
      keybind:
        platform === 'win' ? (
          <>
            <span className="key">Ctrl</span> + <span className="key">Click</span>
          </>
        ) : (
          <>
            <span className="key">⌘</span> + <span className="key">Click</span>
          </>
        ),
    },
  ]

  // Editor keybinds
  const editorRows = [
    {
      action: 'Save Changes',
      keybind:
        platform === 'win' ? (
          <>
            <span className="key">Ctrl</span> + <span className="key">S</span>
          </>
        ) : (
          <>
            <span className="key">⌘</span> + <span className="key">S</span>
          </>
        ),
    },
    {
      action: 'Normalize Frank Elements',
      keybind:
        platform === 'win' ? (
          <>
            <span className="key">Ctrl</span> + <span className="key">Shift</span> + <span className="key">F</span>
          </>
        ) : (
          <>
            <span className="key">⌘</span> + <span className="key">Shift</span> + <span className="key">F</span>
          </>
        ),
    },
  ]

  return (
    <div className="border-border border p-4">
      {/* Platform selector */}
      <div className="flex flex-col items-center">
        <span className="mb-1 text-sm font-medium">Platform</span>
        <SwitchToggle
          options={['Windows', 'macOS']}
          value={platform === 'win' ? 'Windows' : 'macOS'}
          onChange={(value) => setPlatform(value === 'Windows' ? 'win' : 'mac')}
        />
      </div>

      {/* Keybind tables */}
      <div className="grid gap-8 md:grid-cols-2">
        {renderTable('Studio Keybinds', studioRows)}
        {renderTable('Editor Keybinds', editorRows)}
      </div>
    </div>
  )
}
