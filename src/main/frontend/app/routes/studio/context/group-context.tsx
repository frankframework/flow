import useFlowStore, { isGroupNode } from '~/stores/flow-store'
import { GROUP_COLORS, GROUP_DEFAULT_COLOR } from '~/routes/studio/canvas/nodetypes/group-node'
import { ALL_SHORTCUTS, formatShortcutParts, useShortcutStore } from '~/stores/shortcut-store'
import Button from '~/components/inputs/button'
import Input from '~/components/inputs/input'

export default function GroupContext({ nodeId }: Readonly<{ nodeId: string }>): JSX.Element | null {
  const node = useFlowStore((state): FlowNode | undefined => state.nodes.find((node): boolean => node.id === nodeId))
  const platform = useShortcutStore((state): Platform => state.platform)

  if (!node || !isGroupNode(node)) return null

  const { label, description = '', color = GROUP_DEFAULT_COLOR } = node.data

  const ungroupDef = ALL_SHORTCUTS.find((state): boolean => state.id === 'studio.ungroup')!
  const ungroupParts = formatShortcutParts(ungroupDef, platform)
  const triggerUngroup = (): boolean | void | undefined =>
    useShortcutStore.getState().shortcuts.get('studio.ungroup')?.handler?.()

  return (
    <div className="flex flex-col">
      <div className="p-4">
        <Button onClick={triggerUngroup} className="flex w-full items-center justify-between gap-2 px-4 py-2 text-sm">
          <span>Ungroup</span>
          <span className="flex gap-1">
            {ungroupParts.map((part): JSX.Element => (
              <kbd
                key={part}
                className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 font-mono text-xs"
              >
                {part}
              </kbd>
            ))}
          </span>
        </Button>
      </div>

      <div className="bg-border h-px" />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-foreground-muted text-xs font-semibold tracking-wide uppercase">Name</label>
          <Input
            value={label}
            onChange={(changeEvent): void =>
              useFlowStore.getState().setGroupnodeLabel(nodeId, changeEvent.target.value)
            }
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-foreground-muted text-xs font-semibold tracking-wide uppercase">Description</label>
          <textarea
            value={description}
            onChange={(changeEvent): void =>
              useFlowStore.getState().setGroupnodeDescription(nodeId, changeEvent.target.value)
            }
            rows={3}
            className="border-border bg-background text-foreground focus:ring-ring w-full resize-none rounded border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            placeholder="Add a description..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-foreground-muted text-xs font-semibold tracking-wide uppercase">Color</label>
          <div className="flex flex-wrap gap-2">
            {GROUP_COLORS.map(({ label: colorLabel, value }): JSX.Element => (
              <button
                key={value}
                title={colorLabel}
                onClick={(): void => useFlowStore.getState().setGroupnodeColor(nodeId, value)}
                className="h-7 w-7 rounded-full border-2"
                style={{
                  background: value,
                  borderColor: color === value ? '#3b82f6' : 'transparent',
                  outline: color === value ? '2px solid #3b82f6' : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
