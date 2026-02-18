import { type GeneralSettings as GeneralSettingsType, useSettingsStore } from '../settings-store'
import RadioList from '~/components/inputs/radio-list'

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
      </div>
    </div>
  )
}
