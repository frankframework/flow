import type { FlowNode } from '~/routes/studio/canvas/flow'

const REFERENCE_KEYS = new Set(['source', 'target', 'parentId'])

// Helper function for copying nodes and edges with new IDs while maintaining relationships
export function cloneWithRemappedIds<T>(value: T, idMap: Map<string, string>, generateId: () => string): T {
  if (Array.isArray(value)) {
    return value.map((v) => cloneWithRemappedIds(v, idMap, generateId)) as T
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>

    return Object.fromEntries(
      Object.entries(obj).map(([key, val]) => {
        if (key === 'id' && typeof val === 'string') {
          if (!idMap.has(val)) {
            idMap.set(val, generateId())
          }
          return [key, idMap.get(val)!]
        }

        if (REFERENCE_KEYS.has(key) && typeof val === 'string') {
          return [key, idMap.get(val) ?? val]
        }

        return [key, cloneWithRemappedIds(val, idMap, generateId)]
      }),
    ) as T
  }

  return value
}

// Helper function from frank-doc https://github.com/frankframework/frank-doc/blob/master/frank-doc-frontend/src/app/app.service.ts
export function getFirstLabelGroup(filters: Record<string, string> | undefined): [string, string] {
  const defaultLabelGroup: [string, string] = ['-', '-']
  if (!filters) return defaultLabelGroup
  const labelGroups = Object.entries(filters)
  if (labelGroups.length === 0) return defaultLabelGroup
  return labelGroups[0]
}

// Gathers the label associated with an edge by checking the sourcehandle, defaults to 'success'
export function getEdgeLabelFromHandle(node: FlowNode | undefined, handleId: string | null | undefined): string {
  if (!node?.data || !('sourceHandles' in node.data)) return 'success'

  const handles = (node.data as { sourceHandles?: { type: string; index: number }[] }).sourceHandles ?? []
  const handleIndex = Number(handleId)

  const matched = handles.find((handle: { index: number }) => handle.index === handleIndex)

  return matched?.type?.toLowerCase() ?? 'success'
}

/**  Converts the tagname of a non capitalized element that has a classname attribute to the last part of said classname, e.g.:
 * <pipe name="uploadFiles" className="org.frankframework.pipes.ForEachChildElementPipe" />
 * Becomes <ForEachChildElementPipe name="uploadFiles" />
 */
export function translateElementFromOldToNewFormat(element: Element): { subtype: string; usedClassName: boolean } {
  const tagName = element.tagName
  const className = element.getAttribute('className')
  const isLegacyTag = tagName[0] === tagName[0].toLowerCase()

  if (!isLegacyTag || !className) {
    return {
      subtype: capitalize(tagName),
      usedClassName: false,
    }
  }

  const baseName = className.split('.').at(-1)!.trim()

  return {
    subtype: transformByTag(tagName, baseName),
    usedClassName: true,
  }
}

function transformByTag(tagName: string, baseName: string): string {
  if (tagName === 'pipe') {
    return baseName
  }

  if (tagName === 'messageLog') {
    return transformMessageLog(baseName)
  }

  if (tagName === 'inputWrapper' || tagName === 'outputWrapper') {
    return transformWrapper(tagName, baseName)
  }

  if (tagName === 'inputValidator' || tagName === 'outputValidator') {
    return transformValidator(tagName, baseName)
  }

  return baseName
}

function transformMessageLog(baseName: string): string {
  const suffix = 'TransactionalStorage'

  const prefix = baseName.endsWith(suffix) ? baseName.slice(0, -suffix.length) : baseName

  return `${prefix}MessageLog`
}

function transformWrapper(tagName: string, baseName: string): string {
  const direction = tagName.startsWith('input') ? 'Input' : 'Output'

  const withoutPipe = baseName.endsWith('Pipe') ? baseName.slice(0, -4) : baseName

  const withoutWrapper = withoutPipe.endsWith('Wrapper') ? withoutPipe.slice(0, -7) : withoutPipe

  return `${withoutWrapper}${direction}Wrapper`
}

function transformValidator(tagName: string, baseName: string): string {
  const direction = tagName.startsWith('input') ? 'Input' : 'Output'

  const withoutValidator = baseName.endsWith('Validator') ? baseName.slice(0, -9) : baseName

  return `${withoutValidator}${direction}Validator`
}

function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}
