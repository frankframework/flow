import type { Child, Filters } from '@frankframework/doc-library-core'

export interface FrankElement {
  children?: Child[]
  parent?: string
}

type RawElements = Record<string, { children?: Child[]; parent?: string }>

/** Maps irregular role names to their frankdoc component category key. */
const ROLE_TO_CATEGORY: Record<string, string> = {
  param: 'Parameters',
  messagelog: 'TransactionalStorages',
  errorstorage: 'TransactionalStorages',
  messagestorage: 'TransactionalStorages',
  errormessageformatter: 'ErrorMessageFormatters',
}

const DIRECTION_PREFIXES = ['input', 'output']

/**
 * Collects children from {@link parentName} and recurses up the inheritance chain.
 * {@link seen} prevents infinite loops when the graph contains cycles.
 */
function collectAncestorChildren(parentName: string, rawElements: RawElements, seen: Set<string>, acc: Child[]): void {
  if (seen.has(parentName)) return
  seen.add(parentName)

  const parent = rawElements[parentName]
  if (!parent) return

  if (parent.children) acc.push(...parent.children)
  if (parent.parent) collectAncestorChildren(parent.parent, rawElements, seen, acc)
}

/**
 * Returns all children of {@link element}, including those inherited from ancestor
 * classes.
 */
function collectAllChildren(element: FrankElement, rawElements: RawElements): Child[] {
  const allChildren: Child[] = [...(element.children ?? [])]
  if (element.parent) collectAncestorChildren(element.parent, rawElements, new Set(), allChildren)
  return allChildren
}

/**
 * Returns true when type is a FrankFramework Java interface
 * and droppedLower is a member of the corresponding component category.
 * Derives the category key by stripping the prefix.
 */
function matchesInterfaceType(type: string, droppedLower: string, components: Record<string, string[]>): boolean {
  const simpleName = type.split('.').at(-1) ?? type
  if (!/^I[A-Z]/.test(simpleName)) return false

  const base = simpleName.slice(1)
  const categoryKey = base.endsWith('s') ? base : `${base}s`
  const category = components[categoryKey]

  return Array.isArray(category) && category.some((n) => n.toLowerCase() === droppedLower)
}

/**
 * Returns true when frankElement can accept droppedName as a child.
 * Checks role name equality, category membership, and Java interface type compatibility.
 */
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
    if (child.type && matchesInterfaceType(child.type, droppedLower, components)) return true
    return false
  })
}

/**
 * Returns true when droppedName belongs to the component category implied by roleName.
 */
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
