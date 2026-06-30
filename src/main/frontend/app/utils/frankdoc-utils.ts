import type { ElementProperty } from '@frankframework/doc-library-core'
import { getHandleTypes } from '~/hooks/use-handle-types'

const ROUTING_OUTCOME_FORWARDS = new Set([
  'then',
  'else',
  'lessthan',
  'greaterthan',
  'equals',
  'stop',
  'continue',
  'empty',
])

export interface SourceHandle {
  type: string
  index: number
}

export function resolveForwardsWithInheritance(
  forwards: Record<string, ElementProperty> | undefined,
): Record<string, ElementProperty> {
  const resolved = forwards ?? {}

  const isRoutingPipe = Object.keys(resolved).some((forward) => ROUTING_OUTCOME_FORWARDS.has(forward))
  if (isRoutingPipe) return resolved

  return { success: {}, ...resolved }
}

export function getDefaultSourceHandles(resolvedForwards: Record<string, ElementProperty> | undefined): SourceHandle[] {
  const handleTypes = getHandleTypes(resolvedForwards)
  if (handleTypes.length === 0) return []

  const defaultType = handleTypes.find((type) => type !== 'exception') ?? handleTypes[0]
  return [{ type: defaultType, index: 1 }]
}
