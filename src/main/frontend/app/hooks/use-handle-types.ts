import { useMemo } from 'react'
import type { ElementProperty } from '@frankframework/doc-library-core'

export function getHandleTypes(typesAllowed?: Record<string, ElementProperty>): string[] {
  if (!typesAllowed) return []

  return Object.keys(typesAllowed).flatMap((type) => (type === '*' ? ['custom'] : [type]))
}

export function useHandleTypes(typesAllowed?: Record<string, ElementProperty>) {
  return useMemo(() => getHandleTypes(typesAllowed), [typesAllowed])
}
