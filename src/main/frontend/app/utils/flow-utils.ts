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
