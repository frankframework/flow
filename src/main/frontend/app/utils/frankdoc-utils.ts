import { getInheritedProperties } from '@frankframework/doc-library-core'
import type { ElementClass, ElementProperty, EnumValue } from '@frankframework/doc-library-core'
import { getHandleTypes } from '~/hooks/use-handle-types'

export type SourceHandle = {
  type: string
  index: number
}

type ForwardSource = {
  forwards?: Record<string, ElementProperty>
  labels?: Record<string, string>
  parent?: string
}

export function resolveForwardsWithInheritance(
  element: ForwardSource | null | undefined,
  allElements?: Record<string, ElementClass>,
  enums?: Record<string, Record<string, EnumValue>>,
): Record<string, ElementProperty> {
  if (!element) return {}

  const ownForwards = element.forwards ?? {}

  const inherited =
    allElements && element.parent
      ? getInheritedProperties(element as ElementClass, allElements, enums ?? {}).forwards
      : {}

  const merged = { ...inherited, ...ownForwards }

  const isRouter = element.labels?.EIP === 'Router'
  if (isRouter) {
    const { success: _omit, ...withoutSuccess } = merged
    return withoutSuccess
  }

  return merged
}

export function getDefaultSourceHandles(resolvedForwards?: Record<string, ElementProperty>): SourceHandle[] {
  const handleTypes = getHandleTypes(resolvedForwards)
  if (handleTypes.length === 0) return []

  const defaultType = handleTypes.find((type) => type !== 'exception') ?? handleTypes[0]
  return [{ type: defaultType, index: 1 }]
}
