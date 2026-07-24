import { create } from 'zustand'

export type ToastOptions = {
  type: 'ERROR' | 'WARNING' | 'INFO' | 'SUCCESS'
  title?: string
  message: string
  duration?: number
}

export type ToastStore = {
  toasts: ToastOptions[]
  addToast: (toast: ToastOptions) => void
  removeToast: (index: number) => void
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast: ToastOptions): void => set((state) => ({ toasts: [...state.toasts, toast] })),
  removeToast: (index: number): void =>
    set((state) => ({
      toasts: state.toasts.filter((_, toastsIndex) => toastsIndex !== index),
    })),
}))

export default useToastStore
