import { type GeneralSettings, useSettingsStore } from '~/routes/settings/settings-store'
import { useEffect, useState } from 'react'

type LightOrDarkTheme = Exclude<GeneralSettings['theme'], 'system'>

export function useTheme(): LightOrDarkTheme {
  const userTheme = useSettingsStore((state) => state.general.theme)
  const [systemTheme, setSystemTheme] = useState<LightOrDarkTheme>(() => {
    return globalThis.window !== undefined && globalThis.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  })

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: light)')
    const handler = () => setSystemTheme(mediaQuery.matches ? 'light' : 'dark')
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return userTheme === 'system' ? systemTheme : userTheme
}
