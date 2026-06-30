import { Handle, Position } from '@xyflow/react'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'

const COMPACT_INITIALS_BOX_SIZE = 160
const COMPACT_PADDING_TOP = 8
const COMPACT_HANDLE_SIZE = 15
const COMPACT_HANDLE_GAP = 4

export type ZoomedOutNodeProps = {
  subtype: string
  name?: string
  attributes?: Record<string, string>
  colorVariable: string
  selected?: boolean
  showTargetHandle?: boolean
  sourceHandles?: { type: string; index: number }[]
  width?: number
}

function getAbbreviation(subtype: string): string {
  return subtype.replaceAll(/[a-z]/g, '').slice(0, 4) || subtype.slice(0, 2).toUpperCase()
}

/**
 * Compact representation of a node shown when the canvas is zoomed out far enough that the full
 * node would be unreadable. Renders an initials box with the subtype, name attributes and the
 * handles aligned under it.
 */
export default function ZoomedOutNode({
  subtype,
  name,
  attributes,
  colorVariable,
  selected,
  showTargetHandle = true,
  sourceHandles = [],
  width = FlowConfig.NODE_DEFAULT_WIDTH,
}: Readonly<ZoomedOutNodeProps>) {
  const abbr = getAbbreviation(subtype)

  const compactXOffsetPx = (width - COMPACT_INITIALS_BOX_SIZE) / 2 - COMPACT_HANDLE_SIZE - COMPACT_HANDLE_GAP
  const compactHandleTop =
    COMPACT_PADDING_TOP + COMPACT_INITIALS_BOX_SIZE / 2 - COMPACT_HANDLE_SIZE / 2 + COMPACT_HANDLE_SIZE

  return (
    <>
      <div
        className="flex flex-col items-center gap-2 rounded-md"
        style={{
          width: `${width}px`,
          paddingTop: `${COMPACT_PADDING_TOP}px`,
          paddingBottom: '8px',
          ...(selected && { borderColor: `var(${colorVariable})` }),
        }}
      >
        <div
          className="flex h-40 w-40 shrink-0 items-center justify-center rounded-3xl shadow-md"
          style={{
            backgroundColor: `color-mix(in srgb, var(${colorVariable}) 25%, transparent)`,
            border: `3px solid var(${colorVariable})`,
          }}
        >
          <span className="text-5xl font-black tracking-tight" style={{ color: `var(${colorVariable})` }}>
            {abbr}
          </span>
        </div>

        <span className="text-center text-3xl leading-snug font-semibold whitespace-nowrap">{subtype}</span>

        {name && <span className="text-foreground-muted text-center text-3xl whitespace-nowrap">{name}</span>}
        {attributes &&
          Object.entries(attributes).map(([key, value]) => (
            <span key={key} className="text-foreground-muted text-center text-2xl whitespace-nowrap">
              {value || key}
            </span>
          ))}
      </div>

      {showTargetHandle && (
        <>
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              left: compactXOffsetPx,
              top: `${compactHandleTop}px`,
              transform: 'translate(-50%, -50%)',
              width: `${COMPACT_HANDLE_SIZE}px`,
              height: `${COMPACT_HANDLE_SIZE}px`,
              backgroundColor: '#B2B2B2',
              border: '1px solid rgba(107, 114, 128, 0.5)',
            }}
          />
          <Handle
            type="target"
            position={Position.Left}
            isConnectableStart={false}
            style={{
              opacity: 0,
              left: compactXOffsetPx,
              width: `${COMPACT_HANDLE_SIZE}px`,
              height: `${COMPACT_HANDLE_SIZE}px`,
              top: `${compactHandleTop}px`,
            }}
          />
        </>
      )}

      {sourceHandles.length > 0 && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            right: compactXOffsetPx,
            top: `${compactHandleTop}px`,
            transform: 'translate(50%, -50%)',
            width: `${COMPACT_HANDLE_SIZE}px`,
            height: `${COMPACT_HANDLE_SIZE}px`,
            backgroundColor: '#B2B2B2',
            border: '1px solid rgba(107, 114, 128, 0.5)',
          }}
        />
      )}

      {sourceHandles.map((handle) => (
        <Handle
          key={handle.type + handle.index}
          type="source"
          position={Position.Right}
          id={handle.index.toString()}
          style={{
            top: `${compactHandleTop}px`,
            right: compactXOffsetPx,
            width: `${COMPACT_HANDLE_SIZE}px`,
            height: `${COMPACT_HANDLE_SIZE}px`,
            opacity: 0,
          }}
        />
      ))}
    </>
  )
}
