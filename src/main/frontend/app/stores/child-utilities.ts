import type { ComponentNodeData } from '~/routes/studio/canvas-flow/nodetypes/component-node'

export function addChildRecursive(
  children: ComponentNodeData[],
  targetId: string,
  newChild: ComponentNodeData,
): ComponentNodeData[] {
  return children.map((child): ComponentNodeData => {
    if (child.id === targetId) {
      return { ...child, children: [...(child.children || []), newChild] }
    }
    if (child.children && child.children.length > 0) {
      return { ...child, children: addChildRecursive(child.children, targetId, newChild) }
    }
    return child
  })
}

export function updateChildRecursive(
  children: ComponentNodeData[],
  updatedChild: ComponentNodeData,
): ComponentNodeData[] {
  return children.map((child): ComponentNodeData => {
    if (child.id === updatedChild.id) {
      return {
        ...child,
        ...updatedChild,
      }
    }

    if (child.children && child.children.length > 0) {
      return {
        ...child,
        children: updateChildRecursive(child.children, updatedChild),
      }
    }

    return child
  })
}

export function deleteChildRecursive(children: ComponentNodeData[], childId: string): ComponentNodeData[] {
  return children
    .filter((child): boolean => child.id !== childId) // remove if it matches here
    .map((child): ComponentNodeData => {
      if (child.children && child.children.length > 0) {
        return {
          ...child,
          children: deleteChildRecursive(child.children, childId),
        }
      }
      return child
    })
}

export function findChildRecursive(children: ComponentNodeData[], targetId: string): ComponentNodeData | null {
  for (const child of children) {
    if (child.id === targetId) return child
    if (child.children?.length) {
      const found = findChildRecursive(child.children, targetId)
      if (found) return found
    }
  }
  return null
}
