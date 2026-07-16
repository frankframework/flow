import { useMemo } from 'react'
import type { ElementProperty } from '@frankframework/doc-library-core'

export function useHandleTypes(typesAllowed?: Record<string, ElementProperty>) {
  return useMemo(() => {
    // Always include the 'success' handle, using a Set to avoid duplicates
    const handles = new Set<string>()

    if (!typesAllowed) return [...handles]

    for (const type of Object.keys(typesAllowed)) {
      handles.add(type === '*' ? 'custom' : type)
    }

    return [...handles]
  }, [typesAllowed])
}
