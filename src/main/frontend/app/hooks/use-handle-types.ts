import { useMemo } from 'react'
import type { ElementProperty } from '@frankframework/ff-doc'

export function useHandleTypes(typesAllowed?: Record<string, ElementProperty>) {
  return useMemo(() => {
    // Always include the 'success' handle, using a Set to avoid duplicates
    const handles = new Set<string>(['success'])

    if (!typesAllowed) return [...handles]

    if ('*' in typesAllowed) {
      handles.add('custom')
    }

    for (const type of Object.keys(typesAllowed)) {
      if (type !== '*') {
        handles.add(type)
      }
    }

    return [...handles]
  }, [typesAllowed])
}
