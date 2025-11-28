import { useState } from 'react'
import SwitchToggle from '~/components/inputs/switch-toggle'

export function KeybindsTable() {
  const [platform, setPlatform] = useState<'win' | 'mac'>('win')

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th colSpan={2} className="pb-2">
              <div className="flex justify-center">
                <SwitchToggle
                  options={['Windows', 'macOS']}
                  value={platform === 'win' ? 'Windows' : 'macOS'}
                  onChange={(value) => setPlatform(value === 'Windows' ? 'win' : 'mac')}
                />
              </div>
            </th>
          </tr>
          <tr>
            <th>Action</th>
            <th>Keybinds</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Delete Node</td>
            <td>
              <>
                <span className="key">Backspace</span> / <span className="key">Delete</span>
              </>
            </td>
          </tr>
          <tr>
            <td>Add Sticky Note</td>
            <td>
              <span className="key">Right-click</span>
            </td>
          </tr>
          <tr>
            <td>Drag Select</td>
            <td>
              <span className="key">Shift</span> + <span className="key">Click</span>
            </td>
          </tr>
          <tr>
            <td>Multi-Select</td>
            <td>
              {platform === 'win' ? (
                <>
                  <span className="key">Ctrl</span> + <span className="key">Click</span>
                </>
              ) : (
                <>
                  <span className="key">⌘</span> + <span className="key">Click</span>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
