/**
 * Sorts the attributes of an XML element in the following order:
 *
 * 1. Namespaced attributes.
 * 2. Mandatory attributes.
 * 3. `name` because its the most used one.
 * 4. All remaining attributes,  alphabetical.
 */
const byKey = ([a]: [string, string], [b]: [string, string]) => a.localeCompare(b)

export function sortAttributes(attrs: Record<string, string>, mandatoryAttrs: Set<string>): [string, string][] {
  const namespaced: [string, string][] = []
  const mandatory: [string, string][] = []
  const nameGroup: [string, string][] = []
  const rest: [string, string][] = []

  for (const entry of Object.entries(attrs)) {
    const [key] = entry
    if (key.includes(':')) {
      namespaced.push(entry)
    } else if (mandatoryAttrs.has(key)) {
      mandatory.push(entry)
    } else if (key === 'name') {
      nameGroup.push(entry)
    } else {
      rest.push(entry)
    }
  }

  namespaced.sort(byKey)
  mandatory.sort(byKey)
  rest.sort(byKey)

  return [...namespaced, ...mandatory, ...nameGroup, ...rest]
}
