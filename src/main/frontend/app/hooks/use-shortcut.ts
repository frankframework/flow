import { useEffect, useRef } from 'react'
import { useShortcutStore } from '~/stores/shortcut-store'

type ShortcutHandlers = Record<string, () => void>

export function useShortcut(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const ids = Object.keys(handlers).join(',')

  useEffect(() => {
    const { setHandler } = useShortcutStore.getState()
    const handlerIds = Object.keys(handlersRef.current)

    for (const id of handlerIds) {
      setHandler(id, () => {
        handlersRef.current[id]?.()
      })
    }

    return () => {
      for (const id of handlerIds) {
        setHandler(id, undefined)
      }
    }
  }, [ids])
}
