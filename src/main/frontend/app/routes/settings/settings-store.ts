import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface EditorSettings {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  lineNumbers: boolean
}

export interface StudioSettings {
  previewOnSave: boolean
  autoRefresh: boolean
}

export interface ProjectSettings {
  recentProjects: string[]
  defaultLocation: string
}

export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  telemetry: boolean
  autoUpdates: boolean
  gradient: boolean
}

export interface SettingsState {
  editor: EditorSettings
  studio: StudioSettings
  projects: ProjectSettings
  general: GeneralSettings

  // Update helpers
  setEditorSettings: (settings: Partial<EditorSettings>) => void
  setStudioSettings: (settings: Partial<StudioSettings>) => void
  setProjectSettings: (settings: Partial<ProjectSettings>) => void
  setGeneralSettings: (settings: Partial<GeneralSettings>) => void

  // Reset helpers
  resetEditorSettings: () => void
  resetStudioSettings: () => void
  resetProjectSettings: () => void
  resetGeneralSettings: () => void
  resetAllSettings: () => void
}

// Default values for settings
const defaultEditorSettings: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
}

const defaultStudioSettings: StudioSettings = {
  previewOnSave: true,
  autoRefresh: true,
}

const defaultProjectSettings: ProjectSettings = {
  recentProjects: [],
  defaultLocation: '',
}

const defaultGeneralSettings: GeneralSettings = {
  language: 'en',
  telemetry: true,
  theme: 'system',
  autoUpdates: true,
  gradient: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editor: { ...defaultEditorSettings },
      studio: { ...defaultStudioSettings },
      projects: { ...defaultProjectSettings },
      general: { ...defaultGeneralSettings },

      setEditorSettings: (settings) => set((state) => ({ editor: { ...state.editor, ...settings } })),

      setStudioSettings: (settings) => set((state) => ({ studio: { ...state.studio, ...settings } })),

      setProjectSettings: (settings) => set((state) => ({ projects: { ...state.projects, ...settings } })),

      setGeneralSettings: (settings) => set((state) => ({ general: { ...state.general, ...settings } })),

      resetEditorSettings: () => set(() => ({ editor: { ...defaultEditorSettings } })),

      resetStudioSettings: () => set(() => ({ studio: { ...defaultStudioSettings } })),

      resetProjectSettings: () => set(() => ({ projects: { ...defaultProjectSettings } })),

      resetGeneralSettings: () => set(() => ({ general: { ...defaultGeneralSettings } })),

      resetAllSettings: () =>
        set(() => ({
          editor: { ...defaultEditorSettings },
          studio: { ...defaultStudioSettings },
          projects: { ...defaultProjectSettings },
          general: { ...defaultGeneralSettings },
        })),
    }),
    {
      name: 'application-settings',
    },
  ),
)
