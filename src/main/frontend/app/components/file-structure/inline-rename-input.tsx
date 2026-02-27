import type { TreeItemIndex } from 'react-complex-tree'

interface InlineRenameInputProps {
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (value: string) => void
  onSubmit: (itemIndex: TreeItemIndex, newName: string) => void
  onCancel: () => void
  itemIndex: TreeItemIndex
}

export default function InlineRenameInput({
  icon: Icon,
  value,
  onChange,
  onSubmit,
  onCancel,
  itemIndex,
}: InlineRenameInputProps) {
  return (
    <div className="flex items-center" onContextMenu={(e) => e.preventDefault()}>
      <Icon className="fill-foreground w-4 flex-shrink-0" />
      <input
        autoFocus
        className="bg-background border-border text-foreground ml-1 rounded-sm border px-1 text-sm focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void onSubmit(itemIndex, value)
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
        onBlur={onCancel}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
