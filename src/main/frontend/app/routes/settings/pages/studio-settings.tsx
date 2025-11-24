import { useSettingsStore } from '~/routes/settings/settings-store'
import Toggle from '~/components/inputs/toggle'
import InputWithLabel from '~/components/inputs/input-with-label'

export default function StudioSettings() {
  const { studio, setStudioSettings } = useSettingsStore()

  return (
    <div className="space-y-3 p-6">
      <div className="border-border bg-background space-y-6 rounded-md border p-6">
        <InputWithLabel
          htmlFor="gradient-toggle"
          label="Display Gradient"
          description="Toggle gradient backgrounds in the app"
        >
          <Toggle
            id="gradient-toggle"
            checked={studio.gradient} // bind to the store value
            onChange={(value: boolean) => setStudioSettings({ gradient: value })} // update store on toggle
          />
        </InputWithLabel>
      </div>
    </div>
  )
}
