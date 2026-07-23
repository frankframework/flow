import useToastStore from '~/stores/toast-store'

export default function useToasts(): {
  showSuccessToast: (message: string, title?: string) => void
  showInfoToast: (message: string, title?: string) => void
  showWarningToast: (message: string, title?: string) => void
  showErrorToast: (message: string, title?: string) => void
} {
  const { addToast } = useToastStore()

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

  return {
    showSuccessToast,
    showInfoToast,
    showWarningToast,
    showErrorToast,
  }
}
