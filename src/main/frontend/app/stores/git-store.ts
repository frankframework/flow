import { create } from 'zustand'
import type { GitStatus, GitFileDiff, FileHunkState } from '~/types/git.types'

type GitStoreState = {
  status: GitStatus | null
  selectedFile: string | null
  fileDiff: GitFileDiff | null
  fileHunkStates: Record<string, FileHunkState>
  commitMessage: string
  isLoading: boolean
  token: string

  setStatus: (status: GitStatus | null) => void
  setSelectedFile: (file: string | null) => void
  setFileDiff: (diff: GitFileDiff | null) => void
  initFileHunks: (file: string, totalHunks: number) => void
  toggleFileHunk: (file: string, index: number) => void
  selectAllFileHunks: (file: string) => void
  clearFileHunks: (file: string) => void
  getFileHunkState: (file: string) => FileHunkState | undefined
  setCommitMessage: (message: string) => void
  setIsLoading: (loading: boolean) => void
  setToken: (token: string) => void
  reset: () => void
}

export const useGitStore = create<GitStoreState>(
  (
    set,
    get,
  ): {
    status: null
    selectedFile: null
    fileDiff: null
    fileHunkStates: Record<string, FileHunkState>
    commitMessage: string
    isLoading: false
    token: string
    setStatus: (status: GitStatus | null) => void
    setSelectedFile: (file: string | null) => void
    setFileDiff: (diff: GitFileDiff | null) => void
    initFileHunks: (file: string, totalHunks: number) => void
    toggleFileHunk: (file: string, index: number) => void
    selectAllFileHunks: (file: string) => void
    clearFileHunks: (file: string) => void
    getFileHunkState: (file: string) => FileHunkState
    setCommitMessage: (message: string) => void
    setIsLoading: (loading: boolean) => void
    setToken: (token: string) => void
    reset: () => void
  } => ({
    status: null,
    selectedFile: null,
    fileDiff: null,
    fileHunkStates: {},
    commitMessage: '',
    isLoading: false,
    token: '',

    setStatus: (status): void => set({ status }),
    setSelectedFile: (file): void => set({ selectedFile: file, fileDiff: null }),
    setFileDiff: (diff): void => set({ fileDiff: diff }),

    initFileHunks: (file, totalHunks): void => {
      const existing = get().fileHunkStates[file]
      if (existing && existing.totalHunks === totalHunks) return
      set(
        (
          state,
        ): {
          fileHunkStates: Record<
            string,
            FileHunkState | { selectedHunks: Set<number>; totalHunks: number; selected: false }
          >
        } => ({
          fileHunkStates: {
            ...state.fileHunkStates,
            [file]: { selectedHunks: new Set(), totalHunks, selected: false },
          },
        }),
      )
    },

    toggleFileHunk: (file, index): void => {
      const state = get().fileHunkStates[file]
      if (!state) return
      const updated = new Set(state.selectedHunks)
      if (updated.has(index)) {
        updated.delete(index)
      } else {
        updated.add(index)
      }
      set(
        (
          s,
        ): {
          fileHunkStates: Record<
            string,
            FileHunkState | { selectedHunks: Set<number>; totalHunks: number; selected: boolean }
          >
        } => ({
          fileHunkStates: {
            ...s.fileHunkStates,
            [file]: { ...state, selectedHunks: updated },
          },
        }),
      )
    },

    selectAllFileHunks: (file): void => {
      const state = get().fileHunkStates[file]
      if (!state) return
      const all = new Set<number>()
      for (let index = 0; index < state.totalHunks; index++) all.add(index)
      set(
        (
          s,
        ): {
          fileHunkStates: Record<
            string,
            FileHunkState | { selectedHunks: Set<number>; selected: true; totalHunks: number }
          >
        } => ({
          fileHunkStates: {
            ...s.fileHunkStates,
            [file]: { ...state, selectedHunks: all, selected: true },
          },
        }),
      )
    },

    clearFileHunks: (file): void => {
      const state = get().fileHunkStates[file]
      if (!state) return
      set(
        (
          s,
        ): {
          fileHunkStates: Record<
            string,
            FileHunkState | { selectedHunks: Set<number>; selected: false; totalHunks: number }
          >
        } => ({
          fileHunkStates: {
            ...s.fileHunkStates,
            [file]: { ...state, selectedHunks: new Set(), selected: false },
          },
        }),
      )
    },

    getFileHunkState: (file): FileHunkState => get().fileHunkStates[file],

    setCommitMessage: (message): void => set({ commitMessage: message }),
    setIsLoading: (loading): void => set({ isLoading: loading }),
    setToken: (token): void => set({ token }),
    reset: (): void =>
      set({
        status: null,
        selectedFile: null,
        fileDiff: null,
        fileHunkStates: {},
        commitMessage: '',
        isLoading: false,
        token: '',
      }),
  }),
)
