import { useMemo } from 'react'
import useToastStore from '~/stores/toast-store'

type Toasts = {
  showSuccessToast: (message: string, title?: string) => void
  showInfoToast: (message: string, title?: string) => void
  showWarningToast: (message: string, title?: string) => void
  showErrorToast: (message: string, title?: string) => void
  logApiWarning: (message: string, error: Error) => void
  logApiError: (message: string, error: Error) => void
}

export default function useToasts(): Toasts {
  // only subscribe to addToast so toasts don't re-render every consumer
  const addToast = useToastStore((state) => state.addToast)

  // memoize to keep stable references, otherwise effects using these re-run every render
  return useMemo((): Toasts => {
    function showSuccessToast(message: string, title = 'Success!'): void {
      addToast({ type: 'SUCCESS', title, message })
    }

    function showInfoToast(message: string, title = 'Info'): void {
      addToast({ type: 'INFO', title, message })
    }

    function showWarningToast(message: string, title = 'Warning'): void {
      addToast({ type: 'WARNING', title, message })
    }

    function showErrorToast(message: string, title = 'Error'): void {
      addToast({ type: 'ERROR', title, message })
    }

    function logApiWarning(message: string, error: Error): void {
      showWarningToast(message)
      console.warn(message, error)
    }

    function logApiError(message: string, error: Error): void {
      showErrorToast(message)
      console.error(message, error)
    }

    return {
      showSuccessToast,
      showInfoToast,
      showWarningToast,
      showErrorToast,
      logApiWarning,
      logApiError,
    }
  }, [addToast])
}
