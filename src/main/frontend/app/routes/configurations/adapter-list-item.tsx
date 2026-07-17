import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import IconLabelButton from '~/components/inputs/icon-label-button'
import ComponentRow from './component-row'

type AdapterListItemProperties = {
  adapterName: string
  adapterPosition: number
  onConfigure: () => void
  onOpenInStudio: (adapterName: string, adapterPosition: number) => void
}

export default function AdapterListItem({
  adapterName,
  adapterPosition,
  onConfigure,
  onOpenInStudio,
}: Readonly<AdapterListItemProperties>): JSX.Element {
  return (
    <ComponentRow
      typeLabel="Adapter"
      primaryLabel={adapterName}
      onConfigure={onConfigure}
      action={
        <IconLabelButton
          icon={<RulerCrossPenIcon className="h-4 w-4 fill-current" />}
          label="Open in Studio"
          onClick={(): void => onOpenInStudio(adapterName, adapterPosition)}
        />
      }
    />
  )
}
