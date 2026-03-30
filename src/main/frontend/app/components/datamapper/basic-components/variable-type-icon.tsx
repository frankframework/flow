import clsx from 'clsx'
import TextSquare from '/icons/solar/Text Square.svg?react'
import BoxMin from '/icons/solar/Box Minimalistic.svg?react'
import List from '/icons/solar/List.svg?react'
import PlusMin from '/icons/solar/Plus, Minus.svg?react'
import Hashtag from '/icons/solar/Hashtag Square.svg?react'

export default function VariableTypeIcon({
  className,
  variableType,
  variableTypeBasic,
}: {
  className?: string
  variableType: string
  variableTypeBasic: string
}) {
  function getIcon() {
    switch (variableTypeBasic) {
      case 'string': {
        return <TextSquare className="h-6" />
      }
      case 'object': {
        return <BoxMin className="h-5" />
      }
      case 'number': {
        return <Hashtag className="h-6" />
      }
      case 'array': {
        return <List className="h-6" />
      }
      case 'boolean': {
        return <PlusMin className="h-6" />
      }
      default: {
        return '?'
      }
    }
  }
  return (
    <div className={clsx('group/variableIcon', className)}>
      <div className="block group-hover/variableIcon:hidden">{getIcon()}</div>
      <div className="hidden group-hover/variableIcon:block">({variableType})</div>
    </div>
  )
}
