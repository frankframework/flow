import { useMemo } from 'react'
import type { ElementProperty } from '@frankframework/ff-doc'

export function useHandleTypes(typesAllowed?: Record<string, ElementProperty>) {
  return useMemo(() => {
    // Elements should always have access to a success handle, indicating a happy path
    const base: string[] = ['success']

    if (!typesAllowed) return base

    // Replace wildcard with 'custom' type
    const hasWildcard = '*' in typesAllowed
    if (hasWildcard) {
      base.push('custom')
    }

    const forwards = Object.keys(typesAllowed).filter((type) => type !== '*')

    return [...base, ...forwards]
  }, [typesAllowed])
}
