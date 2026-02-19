import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AutosaveState {
  enabled: boolean
  delayMs: number
  setEnabled: (enabled: boolean) => void
  setDelayMs: (delayMs: number) => void
}

const useAutosaveStore = create<AutosaveState>()(
  persist(
    (set) => ({
      enabled: false,
      delayMs: 1500,
      setEnabled: (enabled) => set({ enabled }),
      setDelayMs: (delayMs) => set({ delayMs: Math.max(500, delayMs) }),
    }),
    { name: 'frankflow-autosave-settings' },
  ),
)

export default useAutosaveStore
