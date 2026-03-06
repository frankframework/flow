import Toggle from '~/components/inputs/toggle'
import { type GeneralSettings as GeneralSettingsType, useSettingsStore } from '../../../stores/settings-store'
import RadioList from '~/components/inputs/radio-list'
import ValidatedInput from '~/components/inputs/validatedInput'

export default function GeneralSettings() {
  const { general, setGeneralSettings } = useSettingsStore()

  return (
    <div className="space-y-3 p-6">
      <div className="border-border bg-background space-y-6 rounded-md border p-6">
        <p>Customize the application to your liking</p>

        <div className="border-border rounded-md border p-4">
          <p>Select Theme</p>
          <RadioList
            options={{
              light: { Light: 'Light themed' },
              dark: { Dark: 'Dark themed' },
              system: { System: 'Use the same theme as your system' },
            }}
            value={general.theme}
            onChange={(theme) => setGeneralSettings({ theme: theme as GeneralSettingsType['theme'] })}
          />
        </div>
        <div className="border-border rounded-md border p-4">
          <p>Autosave Settings</p>
          <div className="mt-2 flex items-center gap-4">
            <label className="mb-2 block" htmlFor="enable-autosave">
              Enable Autosave
            </label>
            <Toggle
              id="enable-autosave"
              checked={general.autoSave.enabled}
              onChange={(checked) => setGeneralSettings({ autoSave: { ...general.autoSave, enabled: checked } })}
            />
          </div>
          <div className="mt-2 flex items-center gap-4">
            <label className="mb-2 block" htmlFor="autosave-delay">
              Autosave Delay (ms) <p className="text-muted-foreground text-sm">(Saves after X ms of inactivity)</p>
            </label>

            <ValidatedInput
              id="autosave-delay"
              value={general.autoSave.delayMs.toString()}
              disabled={!general.autoSave.enabled}
              patterns={{
                'Must be a positive whole number': /^[1-9]\d*$/,
              }}
              onChange={(event) => {
                const value = event.target.value

                // Only update store if valid number
                if (/^[1-9]\d*$/.test(value)) {
                  setGeneralSettings({
                    autoSave: {
                      ...general.autoSave,
                      delayMs: Number.parseInt(value, 10),
                    },
                  })
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
