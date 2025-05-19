import React from 'react'
import { useSettingsStore } from '../settings-store'
import ValidatedInput from '~/components/inputs/validatedInput'
import Checkbox from '~/components/inputs/checkbox'
import Toggle from '~/components/inputs/toggle'

export default function GeneralSettings() {
  const { general, setGeneralSettings } = useSettingsStore()

  const handleAutoUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneralSettings({ autoUpdates: e.target.checked })
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGeneralSettings({ language: e.target.value })
  }

  const handleTelemetryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneralSettings({ telemetry: e.target.checked })
  }

  return (
    <div className="p-6">
      <h2 className="mb-6 text-2xl font-semibold">General Settings</h2>
      <div className="flex">
        <Toggle onChange={console.log} />
        <Checkbox onChange={console.log} />
      </div>
      <ValidatedInput
        onChange={console.log}
        patterns={{ 'This field can not be empty': /.+/, 'This field must be S only': /s/ }}
      />
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="font-medium">Application Language</label>
          <select
            value={general.language}
            onChange={handleLanguageChange}
            className="w-64 rounded-md border border-gray-200 p-2"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
          </select>
          <span className="text-sm text-gray-500">Set your preferred language for the application interface</span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="auto-updates"
            checked={general.autoUpdates}
            onChange={handleAutoUpdateChange}
            className="h-5 w-5"
          />
          <div>
            <label htmlFor="auto-updates" className="font-medium">
              Automatic Updates
            </label>
            <p className="text-sm text-gray-500">
              Allow the application to check for and install updates automatically
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="telemetry"
            checked={general.telemetry}
            onChange={handleTelemetryChange}
            className="h-5 w-5"
          />
          <div>
            <label htmlFor="telemetry" className="font-medium">
              Share Usage Data
            </label>
            <p className="text-sm text-gray-500">Help improve the application by sending anonymous usage statistics</p>
          </div>
        </div>
      </div>
    </div>
  )
}
