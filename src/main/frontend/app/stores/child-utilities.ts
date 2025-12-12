import type { ChildNode } from '~/routes/studio/canvas/nodetypes/child-node'

export function addChildRecursive(children: ChildNode[], targetId: string, newChild: ChildNode): ChildNode[] {
  return children.map((child) => {
    if (child.id === targetId) {
      return { ...child, children: [...(child.children || []), newChild] }
    }
    if (child.children && child.children.length > 0) {
      return { ...child, children: addChildRecursive(child.children, targetId, newChild) }
    }
    return child
  })
}

export function updateChildRecursive(children: ChildNode[], updatedChild: ChildNode): ChildNode[] {
  return children.map((child) => {
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

export function deleteChildRecursive(children: ChildNode[], childId: string): ChildNode[] {
  return children
    .filter((child) => child.id !== childId) // remove if it matches here
    .map((child) => {
      if (child.children && child.children.length > 0) {
        return {
          ...child,
          children: deleteChildRecursive(child.children, childId),
        }
      }
      return child
    })
}

export function findChildRecursive(children: ChildNode[], targetId: string): ChildNode | null {
  for (const child of children) {
    if (child.id === targetId) return child
    if (child.children?.length) {
      const found = findChildRecursive(child.children, targetId)
      if (found) return found
    }
  }
  return null
}
