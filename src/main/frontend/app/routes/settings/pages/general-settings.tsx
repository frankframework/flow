import { type GeneralSettings as GeneralSettingsType, useSettingsStore } from '../../../stores/settings-store'
import InputWithLabel from '~/components/inputs/input-with-label'
import RadioList from '~/components/inputs/radio-list'
import Toggle from '~/components/inputs/toggle'
import ValidatedInput from '~/components/inputs/validatedInput'

export default function GeneralSettings(): JSX.Element {
  const { general, setGeneralSettings } = useSettingsStore()

  return (
    <div className="space-y-3 p-6">
      <div className="border-border bg-background space-y-2 rounded-md border p-4">
        <p className="font-medium">Theme</p>
        <RadioList
          options={{
            light: { Light: 'Light themed' },
            dark: { Dark: 'Dark themed' },
            system: { System: 'Use the same theme as your system' },
          }}
          value={general.theme}
          onChange={(theme): void => setGeneralSettings({ theme: theme as GeneralSettingsType['theme'] })}
        />
      </div>

      <div className="border-border bg-background space-y-4 rounded-md border p-4">
        <p className="font-medium">Autosave</p>
        <InputWithLabel
          inputSide="right"
          grow
          htmlFor="enable-autosave"
          label="Enable Autosave"
          description="Automatically save changes after a period of inactivity"
        >
          <Toggle
            id="enable-autosave"
            checked={general.autoSave.enabled}
            onChange={(checked): void => setGeneralSettings({ autoSave: { ...general.autoSave, enabled: checked } })}
          />
        </InputWithLabel>
        <InputWithLabel
          inputSide="right"
          grow
          htmlFor="autosave-delay"
          label="Autosave Delay"
          description="Saves after this many milliseconds of inactivity"
        >
          <ValidatedInput
            id="autosave-delay"
            value={general.autoSave.delayMs.toString()}
            disabled={!general.autoSave.enabled}
            patterns={{
              'Must be a positive whole number': /^[1-9]\d*$/,
            }}
            onChange={(event): void => {
              const value = event.target.value
              if (/^[1-9]\d*$/.test(value)) {
                setGeneralSettings({
                  autoSave: {
                    ...general.autoSave,
                    delayMs: Math.trunc(Number(value)),
                  },
                })
              }
            }}
          />
        </InputWithLabel>
      </div>
    </div>
  )
}
