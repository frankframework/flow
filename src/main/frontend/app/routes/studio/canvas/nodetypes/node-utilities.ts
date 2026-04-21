import type { Child, Filters } from '@frankframework/doc-library-core'

export interface FrankElement {
  children?: Child[]
  parent?: string
}

type RawElements = Record<string, { children?: Child[]; parent?: string }>

const ROLE_TO_CATEGORY: Record<string, string> = {
  param: 'Parameters',
  messagelog: 'TransactionalStorages',
  errorstorage: 'TransactionalStorages',
  messagestorage: 'TransactionalStorages',
  errormessageformatter: 'ErrorMessageFormatters',
}

const DIRECTION_PREFIXES = ['input', 'output']

/**
 * Walks the parent chain in the raw frankdoc elements to collect all children
 * including those defined on ancestor classes. The frankdoc library's getXMLElements
 * does not propagate children through inheritance (only attributes/forwards), so we
 * do it ourselves here.
 */
function collectAllChildren(element: FrankElement, rawElements: RawElements): Child[] {
  const allChildren: Child[] = [...(element.children ?? [])]
  const seen = new Set<string>()

  let parentName = element.parent
  while (parentName && !seen.has(parentName)) {
    seen.add(parentName)
    const parent = rawElements[parentName]
    if (!parent) break
    if (parent.children) allChildren.push(...parent.children)
    parentName = parent.parent
  }

  return allChildren
}

export function canAcceptChildStatic(
  frankElement: FrankElement | null,
  droppedName: string,
  filters: Filters | null,
  rawElements?: RawElements,
): boolean {
  if (!frankElement) return false
  if (!filters?.Components) return false

  const droppedLower = droppedName.toLowerCase()
  const components = filters.Components

  const children = rawElements ? collectAllChildren(frankElement, rawElements) : (frankElement.children ?? [])

  if (children.length === 0) return false

  return children.some((child) => {
    if (child.roleName.toLowerCase() === droppedLower) return true

    if (isInCategory(child.roleName, droppedName, components)) return true

    if (child.type) {
      const simpleName = child.type.split('.').at(-1) ?? child.type
      if (/^I[A-Z]/.test(simpleName)) {
        const typeBase = simpleName.slice(1)
        const typeKey = typeBase.endsWith('s') ? typeBase : `${typeBase}s`
        const typeCategory = components[typeKey]
        if (Array.isArray(typeCategory) && typeCategory.some((n) => n.toLowerCase() === droppedLower)) return true
      }
    }

    return false
  })
}

export function isInCategory(roleName: string, droppedName: string, components: Record<string, string[]>): boolean {
  if (!components) return false

  const role = roleName.toLowerCase()
  const droppedLower = droppedName.toLowerCase()

  function matchesCategory(key: string): boolean {
    const category = components[key]
    return Array.isArray(category) && category.some((name) => name.toLowerCase() === droppedLower)
  }

  const directCategory = ROLE_TO_CATEGORY[role]
  if (directCategory && matchesCategory(directCategory)) return true

  const pascal = roleName.charAt(0).toUpperCase() + roleName.slice(1)
  const key = pascal.endsWith('s') ? pascal : `${pascal}s`
  if (matchesCategory(key)) return true

  for (const prefix of DIRECTION_PREFIXES) {
    if (role.startsWith(prefix) && role.length > prefix.length) {
      const stripped = roleName.slice(prefix.length)
      const strippedPascal = stripped.charAt(0).toUpperCase() + stripped.slice(1)
      const strippedKey = strippedPascal.endsWith('s') ? strippedPascal : `${strippedPascal}s`
      if (matchesCategory(strippedKey)) return true
    }
  }

  return false
}
