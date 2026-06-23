import { create } from 'zustand'

export type SaveStatus = 'idle' | 'saving' | 'saved'

type SaveStatusState = {
  saveStatus: SaveStatus
  savedAt: Date | null
  setSaving: () => void
  setSaved: () => void
  setIdle: () => void
}

export const useSaveStatusStore = create<SaveStatusState>()((set) => ({
  saveStatus: 'idle',
  savedAt: null,
  setSaving: () => set({ saveStatus: 'saving' }),
  setSaved: () => set({ saveStatus: 'saved', savedAt: new Date() }),
  setIdle: () => set({ saveStatus: 'idle' }),
}))
