import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '~/hooks/use-theme'

interface ToastOptions {
  type: 'ERROR' | 'WARNING' | 'INFO' | 'SUCCESS'
  title?: string
  message: string
  duration?: number
}

const toastBaseCard =
  'shadow-lg rounded-lg p-4 w-80 max-w-full text-white flex items-start gap-3 transform transition-all duration-300 ease-in-out'
const defaultStyle = 'items-end justify-end pointer-events-none'
const toastStyles = {
  ERROR: {
    container: 'items-center justify-center bg-black/50',
    card: `${toastBaseCard} bg-red-600`,
    icon: '&times;',
    defaultDuration: 2000,
  },
  WARNING: {
    container: defaultStyle,
    card: `${toastBaseCard} bg-yellow-500`,
    icon: '⚠️',
    defaultDuration: 3000,
  },
  INFO: {
    container: defaultStyle,
    card: `${toastBaseCard} bg-blue-500`,
    icon: 'ℹ️',
    defaultDuration: 3000,
  },
  SUCCESS: {
    container: defaultStyle,
    card: `${toastBaseCard} bg-green-500`,
    icon: '✅',
    defaultDuration: 3000,
  },
} as const

type ToastListener = (toast: ToastOptions | null) => void

let listener: ToastListener | null = null

export const showToast = (toast: ToastOptions) => {
  listener?.(toast)
}

export const hideToast = () => {
  listener?.(null)
}

export const registerToastListener = (l: ToastListener) => {
  listener = l
}

export function showSuccessToast(message: string, title = 'Success!') {
  showToast({ type: 'SUCCESS', title, message })
}

export function showInfoToast(message: string, title = 'Info') {
  showToast({ type: 'INFO', title, message })
}
export function showWarningToast(message: string, title = 'Warning') {
  showToast({ type: 'WARNING', title, message })
}

export function showErrorToast(message: string, title = 'Error') {
  showToast({ type: 'ERROR', title, message })
}

export function Toast() {
  const [toast, setToast] = useState<ToastOptions | null>(null)
  const theme = useTheme()

  useEffect(() => {
    registerToastListener(setToast)
  }, [])

  const styles = toast ? toastStyles[toast.type] : null

  useEffect(() => {
    if (!toast || !styles) return

    const timer = setTimeout(hideToast, toast.duration ?? styles.defaultDuration)

    return () => clearTimeout(timer)
  }, [toast, styles])

  if (!toast || !styles) return null

  return createPortal(
    <div className={clsx('fixed inset-0 z-50 flex px-4', styles.container)} onClick={hideToast} data-theme={theme}>
      <div
        className={clsx('pointer-events-auto', toast.type !== 'ERROR' && 'mr-4 mb-4')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx(styles.card)}>
          <div className="flex items-start gap-3 text-xl">
            <div className="flex flex-col">
              <div className="flew-row flex">
                <div className="text-m">{styles.icon}</div>
                {toast.title && <h3 className="text-m font-bold">{toast.title}</h3>}
              </div>
              <p className="text-sm">{toast.message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
