import { useSettingsStore } from '../settings-store'
import Dropdown from '~/components/inputs/dropdown'
import CheckboxWithLabel from '~/components/inputs/checkbox-with-label'
import InputWithLabel from '~/components/inputs/input-with-label'

export default function GeneralSettings() {
  const { general, setGeneralSettings } = useSettingsStore()

  const languageOptions = {
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
  }

  return (
    <div className="space-y-6 p-6">
      <p>Introduction to general settings</p>
      <InputWithLabel
        side="right"
        id="language"
        label="Application Language"
        description="Select your preferred language for the application"
        grow
      >
        <Dropdown
          labelId="language"
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
  )
}
