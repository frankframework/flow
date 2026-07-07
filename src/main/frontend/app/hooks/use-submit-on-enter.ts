import { useEffect, useRef } from 'react'

export function useSubmitOnEnter(onSubmit: () => void, enabled = true) {
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return
      if (document.activeElement instanceof HTMLButtonElement) return
      event.preventDefault()
      onSubmitRef.current()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
