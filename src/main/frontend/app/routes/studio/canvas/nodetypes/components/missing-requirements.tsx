import { type JSX, useState } from 'react'

type MissingRequirementsProperties = {
  missingChildren: string[]
  isFulfilled: boolean
}

function parseRequirement(item: string): { label: string; values: string[] } | { label: null; values: string[] } {
  if (item.startsWith('One of:')) {
    const values = item
      .replace('One of:', '')
      .split(',')
      .map((v): string => v.trim())

    return {
      label: 'One of',
      values,
    }
  }

  return {
    label: null,
    values: [item],
  }
}

export default function MissingRequirements({
  missingChildren,
  isFulfilled,
}: MissingRequirementsProperties): JSX.Element | null {
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({})

  if (isFulfilled || missingChildren.length === 0) return null

  const toggle = (index: number): void => {
    setExpandedMap((previous): Record<number, boolean> => ({
      ...previous,
      [index]: !Object.hasOwn(previous, index),
    }))
  }

  return (
    <div className="border-error bg-error-background m-2 w-[95%] self-start rounded border-l-4 p-2">
      <p className="text-error text-sm font-semibold">This node is missing mandatory children:</p>

      <ul className="text-error mt-1 list-disc pl-4 text-sm">
        {missingChildren.map((item, index): JSX.Element => {
          const { label, values } = parseRequirement(item)
          const expanded = expandedMap[index] || false

          return (
            <li key={index} className="mb-1 cursor-pointer" onClick={(): void => toggle(index)}>
              <div
                title={values.join(', ')}
                className={
                  expanded
                    ? '' // expanded = normal wrapping
                    : 'truncate' // collapsed = single line ellipsis
                }
              >
                {label && <span className="font-medium">{label}: </span>}
                {values.join(', ')}
              </div>

              {expanded && <span className="hover:text-foreground ml-2 text-xs italic">(show less)</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
