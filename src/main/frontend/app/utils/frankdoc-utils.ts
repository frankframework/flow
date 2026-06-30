import type { ElementProperty, FFDocJson } from '@frankframework/doc-library-core'
import { getHandleTypes } from '~/hooks/use-handle-types'

const FIXED_FORWARD_PIPE_CLASS = 'org.frankframework.pipes.FixedForwardPipe'

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
  effectiveForwards: Record<string, ElementProperty> | undefined,
  rawElements: FFDocJson['elements'],
): Record<string, ElementProperty> {
  const forwards = effectiveForwards ?? {}

  const fixedForwardPipe = rawElements[FIXED_FORWARD_PIPE_CLASS]
  if (!fixedForwardPipe?.forwards) return forwards

  const isRoutingPipe = Object.keys(forwards).some((forward) => ROUTING_OUTCOME_FORWARDS.has(forward))
  if (isRoutingPipe) return forwards

  return { ...fixedForwardPipe.forwards, ...forwards }
}

export function getDefaultSourceHandles(resolvedForwards: Record<string, ElementProperty> | undefined): SourceHandle[] {
  const handleTypes = getHandleTypes(resolvedForwards)
  if (handleTypes.length === 0) return []

  const defaultType = handleTypes.find((type) => type !== 'exception') ?? handleTypes[0]
  return [{ type: defaultType, index: 1 }]
}
