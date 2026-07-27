import { type GeneralSettings, useSettingsStore } from '~/stores/settings-store'
import { useEffect, useState } from 'react'

type LightOrDarkTheme = Exclude<GeneralSettings['theme'], 'system'>

export function useTheme(): LightOrDarkTheme {
  const userTheme = useSettingsStore((state): 'light' | 'dark' | 'system' => state.general.theme)
  const [systemTheme, setSystemTheme] = useState<LightOrDarkTheme>('dark')

  useEffect((): (() => void) => {
    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: light)')
    setSystemTheme(mediaQuery.matches ? 'light' : 'dark')
    const handler = (): void => setSystemTheme(mediaQuery.matches ? 'light' : 'dark')
    mediaQuery.addEventListener('change', handler)
    return (): void => mediaQuery.removeEventListener('change', handler)
  }, [])

  return userTheme === 'system' ? systemTheme : userTheme
}
