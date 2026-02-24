import { create } from 'zustand'
import type { GitStatus, GitFileDiff, FileHunkState } from '~/types/git.types'

interface GitStoreState {
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

export const useGitStore = create<GitStoreState>((set, get) => ({
  status: null,
  selectedFile: null,
  fileDiff: null,
  fileHunkStates: {},
  commitMessage: '',
  isLoading: false,
  token: '',

  setStatus: (status) => set({ status }),
  setSelectedFile: (file) => set({ selectedFile: file, fileDiff: null }),
  setFileDiff: (diff) => set({ fileDiff: diff }),

  initFileHunks: (file, totalHunks) => {
    const existing = get().fileHunkStates[file]
    if (existing && existing.totalHunks === totalHunks) return
    set((state) => ({
      fileHunkStates: {
        ...state.fileHunkStates,
        [file]: { selectedHunks: new Set(), totalHunks },
      },
    }))
  },

  toggleFileHunk: (file, index) => {
    const state = get().fileHunkStates[file]
    if (!state) return
    const updated = new Set(state.selectedHunks)
    if (updated.has(index)) {
      updated.delete(index)
    } else {
      updated.add(index)
    }
    set((s) => ({
      fileHunkStates: {
        ...s.fileHunkStates,
        [file]: { ...state, selectedHunks: updated },
      },
    }))
  },

  selectAllFileHunks: (file) => {
    const state = get().fileHunkStates[file]
    if (!state) return
    const all = new Set<number>()
    for (let i = 0; i < state.totalHunks; i++) all.add(i)
    set((s) => ({
      fileHunkStates: {
        ...s.fileHunkStates,
        [file]: { ...state, selectedHunks: all },
      },
    }))
  },

  clearFileHunks: (file) => {
    const state = get().fileHunkStates[file]
    if (!state) return
    set((s) => ({
      fileHunkStates: {
        ...s.fileHunkStates,
        [file]: { ...state, selectedHunks: new Set() },
      },
    }))
  },

  getFileHunkState: (file) => get().fileHunkStates[file],

  setCommitMessage: (message) => set({ commitMessage: message }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setToken: (token) => set({ token }),
  reset: () =>
    set({
      status: null,
      selectedFile: null,
      fileDiff: null,
      fileHunkStates: {},
      commitMessage: '',
      isLoading: false,
      token: '',
    }),
}))
