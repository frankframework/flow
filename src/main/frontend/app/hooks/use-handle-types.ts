import { useMemo } from 'react'
import type { ElementProperty } from '@frankframework/doc-library-core'

export function useHandleTypes(typesAllowed?: Record<string, ElementProperty>): string[] {
  return useMemo(() => {
    const handles = new Set<string>()

    if (!typesAllowed) return [...handles]

    for (const type of Object.keys(typesAllowed)) {
      handles.add(type === '*' ? 'custom' : type)
    }

    return [...handles]
  }, [typesAllowed])
}
