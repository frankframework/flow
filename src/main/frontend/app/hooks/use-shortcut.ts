import { useEffect, useRef } from 'react'
import { useShortcutStore } from '~/stores/shortcut-store'

type ShortcutHandlers = Record<string, () => boolean | void>

export function useShortcut(handlers: ShortcutHandlers): void {
  const handlersReference = useRef(handlers)
  handlersReference.current = handlers

  const ids = Object.keys(handlers).join(',')

  useEffect((): (() => void) => {
    const { setHandler } = useShortcutStore.getState()
    const handlerIds = Object.keys(handlersReference.current)

    for (const id of handlerIds) {
      setHandler(id, (): boolean | void => {
        return handlersReference.current[id]?.()
      })
    }

    return (): void => {
      for (const id of handlerIds) {
        setHandler(id, undefined)
      }
    }
  }, [ids])
}
