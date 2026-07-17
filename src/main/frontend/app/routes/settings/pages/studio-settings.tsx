import { useSettingsStore } from '~/stores/settings-store'
import Toggle from '~/components/inputs/toggle'
import InputWithLabel from '~/components/inputs/input-with-label'

export default function StudioSettings(): JSX.Element {
  const { studio, setStudioSettings } = useSettingsStore()

  return (
    <div className="space-y-3 p-6">
      <div className="border-border bg-background space-y-6 rounded-md border p-6">
        <InputWithLabel
          inputSide="right"
          grow
          htmlFor="gradient-toggle"
          label="Display Gradient"
          description="Toggle gradient backgrounds in the app"
        >
          <Toggle
            id="gradient-toggle"
            checked={studio.gradient}
            onChange={(value: boolean): void => setStudioSettings({ gradient: value })}
          />
        </InputWithLabel>

        <InputWithLabel
          inputSide="right"
          grow
          htmlFor="palette-expanded-toggle"
          label="Expand Palette Categories"
          description="Show all palette categories expanded by default"
        >
          <Toggle
            id="palette-expanded-toggle"
            checked={studio.paletteExpandedByDefault}
            onChange={(value: boolean): void => setStudioSettings({ paletteExpandedByDefault: value })}
          />
        </InputWithLabel>
      </div>
    </div>
  )
}
