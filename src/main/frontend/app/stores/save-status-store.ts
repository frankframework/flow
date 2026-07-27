import { create } from 'zustand'

export type SaveStatus = 'idle' | 'saving' | 'saved'

type SaveStatusState = {
  saveStatus: SaveStatus
  savedAt: Date | null
  setSaving: () => void
  setSaved: () => void
  setIdle: () => void
}

export const useSaveStatusStore = create<SaveStatusState>()(
  (set): { saveStatus: 'idle'; savedAt: null; setSaving: () => void; setSaved: () => void; setIdle: () => void } => ({
    saveStatus: 'idle',
    savedAt: null,
    setSaving: (): void => set({ saveStatus: 'saving' }),
    setSaved: (): void => set({ saveStatus: 'saved', savedAt: new Date() }),
    setIdle: (): void => set({ saveStatus: 'idle' }),
  }),
)
