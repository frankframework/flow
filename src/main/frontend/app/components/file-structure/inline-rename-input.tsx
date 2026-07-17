import type { TreeItemIndex } from 'react-complex-tree'
import Input from '~/components/inputs/input'

type InlineRenameInputProperties = {
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
}: InlineRenameInputProperties): JSX.Element {
  return (
    <div className="flex items-center" onContextMenu={(e): void => e.preventDefault()}>
      <Icon className="fill-foreground w-4 flex-shrink-0" />
      <Input
        autoFocus
        wrapperClassName="ml-1"
        inputClassName="py-0.5 text-sm"
        value={value}
        onChange={(changeEvent): void => onChange(changeEvent.target.value)}
        onKeyDown={(keyboardEvent): void => {
          if (keyboardEvent.key === 'Enter') {
            keyboardEvent.preventDefault()
            void onSubmit(itemIndex, value)
          } else if (keyboardEvent.key === 'Escape') {
            onCancel()
          }
        }}
        onBlur={onCancel}
        onClick={(e): void => e.stopPropagation()}
      />
    </div>
  )
}
