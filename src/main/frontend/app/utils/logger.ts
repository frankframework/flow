import { showErrorToast, showWarningToast } from '~/components/toast'

export function logApiWarning(message: string, error: Error): void {
  showWarningToast(message)
  console.warn(message, error)
}

export function logApiError(message: string, error: Error): void {
  showErrorToast(message)
  console.error(message, error)
}
