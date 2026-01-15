import type { Child, Filters } from '@frankframework/ff-doc'

export interface FrankElement {
  children?: Child[]
}

export function canAcceptChildStatic(
  frankElement: FrankElement | null,
  droppedName: string,
  filters: Filters | null,
): boolean {
  if (!frankElement?.children) return false
  if (!filters?.Components) return false

  const droppedLower = droppedName.toLowerCase()
  const components = filters.Components

  return frankElement.children.some((child) => {
    const role = child.roleName.toLowerCase()

    // Case 1: direct match
    if (role === droppedLower) {
      return true
    }

    // Case 2: category match
    return isInCategory(role, droppedName, components)
  })
}

export function isInCategory(roleName: string, droppedName: string, components: Record<string, string[]>): boolean {
  if (!components) return false

  const role = roleName.toLowerCase()
  const droppedLower = droppedName.toLowerCase()

  // Convert "senders" → "Senders"
  const pascal = role.charAt(0).toUpperCase() + role.slice(1)

  // Ensure plural (Senders, Listeners, etc) since categories are stored as plurals
  const key = pascal.endsWith('s') ? pascal : `${pascal}s`

  const category = components[key]

  if (!Array.isArray(category)) return false

  return category.some((name: string) => name.toLowerCase() === droppedLower)
}
