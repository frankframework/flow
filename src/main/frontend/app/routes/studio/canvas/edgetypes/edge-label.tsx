import type { Point } from '~/utils/edge-label-utils'

type EdgeLabelProperties = {
  position: Point
  text: string
  selected?: boolean
  onDelete: () => void
}

export default function EdgeLabel({ position, text, selected, onDelete }: Readonly<EdgeLabelProperties>) {
  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${position.x}px,${position.y}px)`,
        pointerEvents: 'all',
        zIndex: 20,
      }}
      className="nodrag flex flex-col items-center"
    >
      <p className="bg-background border-border relative rounded-md border p-1 px-2 text-sm">
        {text}
        {selected && (
          <button
            className="text-foreground absolute -top-3 -right-2.5 rounded-full border border-black shadow-sm hover:border-red-400 hover:text-red-400"
            onClick={onDelete}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" stroke="currentColor" strokeLinecap="round">
              <line x1="5" y1="5" x2="10" y2="10" />
              <line x1="5" y1="10" x2="10" y2="5" />
            </svg>
          </button>
        )}
      </p>
    </div>
  )
}
