import clsx from 'clsx'
import type { ReactNode } from 'react'

interface NodeChildrenContainerProperties {
  className?: string
  children: ReactNode
}

/**
 * A bordered, inset-shadow container that groups a node's nested elements.
 * Shared by FrankNode and ChildNode so children sit in the same recessed
 * "well" at every level of nesting.
 */
export function NodeChildrenContainer({ className, children }: Readonly<NodeChildrenContainerProperties>) {
  return (
    <div className={clsx('border-border/40 bg-background w-full rounded-md border p-4 inset-shadow-sm', className)}>
      {children}
    </div>
  )
}
