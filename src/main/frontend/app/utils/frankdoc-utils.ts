import type { ElementProperty } from '@frankframework/doc-library-core'
import { getHandleTypes } from '~/hooks/use-handle-types'

export interface SourceHandle {
  type: string
  index: number
}

interface ForwardSource {
  forwards?: Record<string, ElementProperty>
  labels?: Record<string, string>
}

export function resolveForwardsWithInheritance(
  element: ForwardSource | null | undefined,
): Record<string, ElementProperty> {
  const forwards = element?.forwards ?? {}

  if (element?.labels?.EIP === 'Router') return forwards

  return { success: {}, ...forwards }
}

export function getDefaultSourceHandles(resolvedForwards: Record<string, ElementProperty> | undefined): SourceHandle[] {
  const handleTypes = getHandleTypes(resolvedForwards)
  if (handleTypes.length === 0) return []

  const defaultType = handleTypes.find((type) => type !== 'exception') ?? handleTypes[0]
  return [{ type: defaultType, index: 1 }]
}
