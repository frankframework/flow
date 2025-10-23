import { type GeneralSettings, useSettingsStore } from '../settings-store'
import Dropdown from '~/components/inputs/dropdown'
import CheckboxWithLabel from '~/components/inputs/checkbox-with-label'
import InputWithLabel from '~/components/inputs/input-with-label'
import Button from '~/components/inputs/button'
import Input from '~/components/inputs/input'
import RadioList from '~/components/inputs/radio-list'
import Toggle from '~/components/inputs/toggle'
import ValidatedInput from '~/components/inputs/validatedInput'

export default function GeneralSettings() {
  const { general, setGeneralSettings } = useSettingsStore()

  const languageOptions = {
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
  }

  return (
    <div className="space-y-3 p-6">
      <div className="border-border bg-background space-y-6 rounded-md border p-6">
        <Button>Save</Button> <Button>Delete</Button>
        <br />
        <RadioList
          options={{
            light: { Light: 'Wit enzo' },
            dark: { Dark: 'Zwart enzo' },
            system: { System: 'Zelfde als je hebt' },
          }}
          value={general.theme}
          onChange={(theme) => setGeneralSettings({ theme: theme as GeneralSettings['theme'] })}
        />
        <br />
        <Input onChange={console.log} />
        <ValidatedInput
          onChange={console.log}
          patterns={{
            "The field can't be empty": /.+/,
            'The field must be a number': /^\d+$/,
            'The field must be a number between 0 and 100': /^(100|[1-9]?\d)$/,
          }}
        />
      </div>
      <div className="border-border bg-background space-y-6 rounded-md border p-6">
        <p>Introduction to general settings</p>

        <InputWithLabel
          inputSide="right"
          htmlFor="theme"
          label="Application Theme"
          description="Select your preferred theme for the application"
          grow
        >
          <Dropdown
            id="theme"
            value={general.theme}
            onChange={(theme) => setGeneralSettings({ theme: theme as GeneralSettings['theme'] })}
            options={{ light: 'Light', dark: 'Dark', system: 'System' }}
            className="w-100!"
          />
        </InputWithLabel>

        <InputWithLabel
          inputSide="right"
          htmlFor="language"
          label="Application Language"
          description="Select your preferred language for the application"
          grow
        >
          <Dropdown
            id="language"
            value={general.language}
            onChange={(language) => setGeneralSettings({ language })}
            options={languageOptions}
            className="w-100!"
          />
        </InputWithLabel>

        <CheckboxWithLabel
          checked={general.autoUpdates}
          onChange={(autoUpdates) => setGeneralSettings({ autoUpdates })}
          label="Automatic Updates"
          description="Allow the application to check for and install updates automatically"
        />

        <CheckboxWithLabel
          checked={general.telemetry}
          onChange={(telemetry) => setGeneralSettings({ telemetry })}
          label="Share Usage Data"
          description="Help improve the application by sending anonymous usage statistics"
        />
      </div>
    </div>
  )
}
