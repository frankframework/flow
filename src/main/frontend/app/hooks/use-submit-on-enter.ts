import { useEffect, useRef } from 'react'

export function useSubmitOnEnter(onSubmit: () => void, enabled = true): void {
  const onSubmitReference = useRef(onSubmit)
  onSubmitReference.current = onSubmit

  useEffect((): (() => void) | undefined => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter') return
      if (document.activeElement instanceof HTMLButtonElement) return
      event.preventDefault()
      onSubmitReference.current()
    }

    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
