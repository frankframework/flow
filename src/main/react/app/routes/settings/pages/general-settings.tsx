import { type GeneralSettings, useSettingsStore } from '../settings-store'
import Dropdown from '~/components/inputs/dropdown'
import CheckboxWithLabel from '~/components/inputs/checkbox-with-label'
import InputWithLabel from '~/components/inputs/input-with-label'
import Button from '~/components/inputs/button'
import RadioButton from '~/components/inputs/radio-button'
import Input from "~/components/inputs/input";

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
      <div className="space-y-6 rounded-md border border-gray-200 p-6">
        <Button>Button</Button>
        <br />
        <RadioButton onChange={console.log} />
        <br />
        <Input onChange={console.log} />
      </div>
      <div className="space-y-6 rounded-md border border-gray-200 p-6">
        <p>Introduction to general settings</p>

        <InputWithLabel
          side="right"
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
          side="right"
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
