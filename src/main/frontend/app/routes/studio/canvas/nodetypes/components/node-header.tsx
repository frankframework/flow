import clsx from 'clsx'
import type { ReactNode } from 'react'

interface NodeHeaderProperties {
  subtype: string
  name?: string
  colorVariable: string
  gradientEnabled: boolean
  className?: string
  children?: ReactNode
}

/**
 * The colored title bar shared by every node card.
 * Keeping it in one component makes nested nodes look like their parent.
 */
export function NodeHeader({
  subtype,
  name,
  colorVariable,
  gradientEnabled,
  className,
  children,
}: Readonly<NodeHeaderProperties>) {
  return (
    <div
      className={clsx('border-b-border relative box-border w-full rounded-t-md border-b p-1', className)}
      style={{
        background: gradientEnabled
          ? `radial-gradient(
            ellipse farthest-corner at 20% 20%,
            var(${colorVariable}) 0%,
            var(--color-background) 100%
          )`
          : `var(${colorVariable})`,
      }}
    >
      <h1 className="text-foreground font-bold">{subtype}</h1>
      <p className="text-foreground overflow-hidden text-sm text-ellipsis whitespace-nowrap">{name}</p>
      {children}
    </div>
  )
}
