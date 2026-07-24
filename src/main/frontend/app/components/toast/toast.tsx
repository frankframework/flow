import clsx from 'clsx'
import { type JSX, type ReactPortal, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '~/hooks/use-theme'
import useToastStore, { type ToastOptions } from '~/stores/toast-store'

const toastBaseCard = 'shadow-lg rounded-lg p-4 w-80 max-w-full text-white flex items-start gap-3'
const defaultStyle = 'items-end justify-end pointer-events-none'
const toastStyles = {
  ERROR: {
    container: defaultStyle,
    card: `${toastBaseCard} bg-error`,
    icon: '',
    defaultDuration: 5000,
  },
  WARNING: {
    container: defaultStyle,
    card: `${toastBaseCard} bg-warning`,
    icon: '⚠️',
    defaultDuration: 5000,
  },
  INFO: {
    container: defaultStyle,
    card: `${toastBaseCard} bg-info`,
    icon: 'ℹ️',
    defaultDuration: 5000,
  },
  SUCCESS: {
    container: defaultStyle,
    card: `${toastBaseCard} bg-success`,
    icon: '✅',
    defaultDuration: 2000,
  },
} as const

export function ToastsContainer(): ReactPortal | null {
  const { toasts } = useToastStore()

  return createPortal(
    <>
      {toasts.map((toast, index) => (
        <Toast options={toast} index={index} />
      ))}
    </>,
    document.body,
  )
}

export function Toast({ options, index }: { options: ToastOptions; index: number }): JSX.Element | null {
  const theme = useTheme()
  const { removeToast } = useToastStore()
  const { title, message, duration, type } = options
  const styles = useMemo(() => toastStyles[type], [type])

  useEffect((): (() => void) | void => {
    if (!styles) return

    const timer = setTimeout(() => removeToast(index), duration ?? styles.defaultDuration)

    return (): void => clearTimeout(timer)
  }, [styles, options, duration, removeToast, index])

  if (!styles) return null

  return (
    <div
      className={clsx('fixed inset-0 z-50 flex px-4', styles.container)}
      onClick={() => removeToast(index)}
      data-theme={theme}
    >
      <div className="pointer-events-auto mr-4 mb-4" onClick={(event): void => event.stopPropagation()}>
        <div className={clsx(styles.card)}>
          <div className="flex items-start gap-3 text-xl">
            <div className="flex flex-col">
              <div className="flew-row flex">
                <div className="text-m">{styles.icon}</div>
                {title && <h3 className="text-m font-bold">{title}</h3>}
              </div>
              <p className="text-sm">{message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
