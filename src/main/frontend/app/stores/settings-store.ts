import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EditorSettings = {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  lineNumbers: boolean
}

export type StudioSettings = {
  previewOnSave: boolean
  autoRefresh: boolean
  gradient: boolean
  paletteExpandedByDefault: boolean
}

export type ProjectSettings = {
  recentProjects: string[]
  defaultLocation: string
}

export type GeneralSettings = {
  theme: 'light' | 'dark' | 'system'
  language: string
  telemetry: boolean
  autoUpdates: boolean
  autoSave: AutosaveSettings
}

export type AutosaveSettings = {
  enabled: boolean
  delayMs: number
}

export type SettingsState = {
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
  gradient: false,
  paletteExpandedByDefault: false,
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
  autoSave: {
    enabled: true,
    delayMs: 1500,
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (
      set,
    ): {
      editor: { fontSize: number; tabSize: number; wordWrap: boolean; lineNumbers: boolean }
      studio: { previewOnSave: boolean; autoRefresh: boolean; gradient: boolean; paletteExpandedByDefault: boolean }
      projects: { recentProjects: string[]; defaultLocation: string }
      general: {
        theme: 'light' | 'dark' | 'system'
        language: string
        telemetry: boolean
        autoUpdates: boolean
        autoSave: AutosaveSettings
      }
      setEditorSettings: (settings: Partial<EditorSettings>) => unknown
      setStudioSettings: (settings: Partial<StudioSettings>) => unknown
      setProjectSettings: (settings: Partial<ProjectSettings>) => unknown
      setGeneralSettings: (settings: Partial<GeneralSettings>) => unknown
      resetEditorSettings: () => unknown
      resetStudioSettings: () => unknown
      resetProjectSettings: () => unknown
      resetGeneralSettings: () => unknown
      resetAllSettings: () => unknown
    } => ({
      editor: { ...defaultEditorSettings },
      studio: { ...defaultStudioSettings },
      projects: { ...defaultProjectSettings },
      general: { ...defaultGeneralSettings },

      setEditorSettings: (settings): void =>
        set((state): { editor: { fontSize: number; tabSize: number; wordWrap: boolean; lineNumbers: boolean } } => ({
          editor: { ...state.editor, ...settings },
        })),

      setStudioSettings: (settings): void =>
        set(
          (
            state,
          ): {
            studio: {
              previewOnSave: boolean
              autoRefresh: boolean
              gradient: boolean
              paletteExpandedByDefault: boolean
            }
          } => ({ studio: { ...state.studio, ...settings } }),
        ),

      setProjectSettings: (settings): void =>
        set((state): { projects: { recentProjects: string[]; defaultLocation: string } } => ({
          projects: { ...state.projects, ...settings },
        })),

      setGeneralSettings: (settings): void =>
        set(
          (
            state,
          ): {
            general: {
              theme: 'light' | 'dark' | 'system'
              language: string
              telemetry: boolean
              autoUpdates: boolean
              autoSave: AutosaveSettings
            }
          } => ({ general: { ...state.general, ...settings } }),
        ),

      resetEditorSettings: (): void =>
        set((): { editor: { fontSize: number; tabSize: number; wordWrap: boolean; lineNumbers: boolean } } => ({
          editor: { ...defaultEditorSettings },
        })),

      resetStudioSettings: (): void =>
        set(
          (): {
            studio: {
              previewOnSave: boolean
              autoRefresh: boolean
              gradient: boolean
              paletteExpandedByDefault: boolean
            }
          } => ({ studio: { ...defaultStudioSettings } }),
        ),

      resetProjectSettings: (): void =>
        set((): { projects: { recentProjects: string[]; defaultLocation: string } } => ({
          projects: { ...defaultProjectSettings },
        })),

      resetGeneralSettings: (): void =>
        set(
          (): {
            general: {
              theme: 'light' | 'dark' | 'system'
              language: string
              telemetry: boolean
              autoUpdates: boolean
              autoSave: AutosaveSettings
            }
          } => ({ general: { ...defaultGeneralSettings } }),
        ),

      resetAllSettings: (): void =>
        set(
          (): {
            editor: { fontSize: number; tabSize: number; wordWrap: boolean; lineNumbers: boolean }
            studio: {
              previewOnSave: boolean
              autoRefresh: boolean
              gradient: boolean
              paletteExpandedByDefault: boolean
            }
            projects: { recentProjects: string[]; defaultLocation: string }
            general: {
              theme: 'light' | 'dark' | 'system'
              language: string
              telemetry: boolean
              autoUpdates: boolean
              autoSave: AutosaveSettings
            }
          } => ({
            editor: { ...defaultEditorSettings },
            studio: { ...defaultStudioSettings },
            projects: { ...defaultProjectSettings },
            general: { ...defaultGeneralSettings },
          }),
        ),
    }),
    {
      name: 'application-settings',
      merge: (
        persistedState,
        currentState,
      ): {
        general: {
          autoSave: { enabled: boolean; delayMs: number }
          theme: 'light' | 'dark' | 'system'
          language: string
          telemetry: boolean
          autoUpdates: boolean
        }
        editor: EditorSettings
        studio: StudioSettings
        projects: ProjectSettings
        setEditorSettings: (settings: Partial<EditorSettings>) => void
        setStudioSettings: (settings: Partial<StudioSettings>) => void
        setProjectSettings: (settings: Partial<ProjectSettings>) => void
        setGeneralSettings: (settings: Partial<GeneralSettings>) => void
        resetEditorSettings: () => void
        resetStudioSettings: () => void
        resetProjectSettings: () => void
        resetGeneralSettings: () => void
        resetAllSettings: () => void
      } => {
        const persisted = (persistedState ?? {}) as Partial<SettingsState>
        return {
          ...currentState,
          ...persisted,
          general: {
            ...currentState.general,
            ...persisted.general,
            autoSave: {
              ...currentState.general.autoSave,
              ...persisted.general?.autoSave,
            },
          },
        }
      },
    },
  ),
)
