export interface ChildNode {
  id: string
  subtype: string
  type: string
  name?: string
  attributes?: Record<string, string>

  children?: ChildNode[]
}

interface ChildNodeProperties {
  child: ChildNode
  gradientEnabled: boolean
  onEdit: (id: string) => void
}

export function ChildNode({ child, gradientEnabled, onEdit }: Readonly<ChildNodeProperties>) {
  return (
    <div className="mb-2 rounded-md p-2" onDoubleClick={() => onEdit(child.id)}>
      {/* Header */}
      <div
        className="border-border rounded-t-md border-b p-1"
        style={{
          background: gradientEnabled
            ? `radial-gradient(
                ellipse farthest-corner at 20% 20%,
                var(--type-${child.type?.toLowerCase()}) 0%,
                var(--color-background) 100%
              )`
            : `var(--type-${child.type?.toLowerCase()})`,
        }}
      >
        <h1 className="font-bold">{child.subtype}</h1>
        <p className="overflow-hidden text-sm whitespace-nowrap">{child.name?.toUpperCase()}</p>
      </div>

      {/* Attributes */}
      {child.attributes &&
        Object.entries(child.attributes).map(([key, value]) => (
          <div key={key} className="my-1 px-1">
            <p className="text-sm font-bold">{key}</p>
            <p className="text-sm">{value}</p>
          </div>
        ))}

      {/* Recursive children */}
      {child.children && child.children.length > 0 && (
        <div className="mt-2 border-l pl-4">
          {child.children.map((nestedChild) => (
            <ChildNode key={nestedChild.id} child={nestedChild} gradientEnabled={gradientEnabled} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
