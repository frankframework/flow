import { useEffect, useRef } from 'react'
import { useShortcutStore } from '~/stores/shortcut-store'

type ShortcutHandlers = Record<string, () => boolean | void>

export function useShortcut(handlers: ShortcutHandlers) {
  const handlersReference = useRef(handlers)
  handlersReference.current = handlers

  const ids = Object.keys(handlers).join(',')

  useEffect(() => {
    const { setHandler } = useShortcutStore.getState()
    const handlerIds = Object.keys(handlersReference.current)

    for (const id of handlerIds) {
      setHandler(id, () => {
        return handlersReference.current[id]?.()
      })
    }

    return () => {
      for (const id of handlerIds) {
        setHandler(id, undefined)
      }
    }
  }, [ids])
}
