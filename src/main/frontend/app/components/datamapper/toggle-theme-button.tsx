import { useSettingsStore } from '~/routes/settings/settings-store'
import { useTheme } from '~/hooks/use-theme'

function ThemeToggleButton() {
  const theme = useTheme()
  const setGeneralSettings = useSettingsStore((s) => s.setGeneralSettings)

  const toggleTheme = () => {
    setGeneralSettings({
      theme: theme === 'light' ? 'dark' : 'light',
    })
  }

  return (
    <button
      className="border-border hover:bg-hover active:bg-selected rounded-md border px-4 py-2"
      onClick={toggleTheme}
    >
      Switch to {theme === 'light' ? 'dark' : 'light'} mode
    </button>
  )
}

export default ThemeToggleButton
