import clsx from 'clsx'
import TextSquare from '/icons/solar/Text Square.svg?react'
import BoxMin from '/icons/solar/Box Minimalistic.svg?react'
import List from '/icons/solar/List.svg?react'
import PlusMin from '/icons/solar/Plus, Minus.svg?react'
import Hashtag from '/icons/solar/Hashtag Square.svg?react'
import HoverInfo from './hover-info'

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
        return <TextSquare className="fill-foreground h-6" />
      }
      case 'object': {
        return <BoxMin className="fill-foreground h-5" />
      }
      case 'number': {
        return <Hashtag className="fill-foreground h-6" />
      }
      case 'array': {
        return <List className="fill-foreground h-6" />
      }
      case 'boolean': {
        return <PlusMin className="fill-foreground h-6" />
      }
      default: {
        return '?'
      }
    }
  }
  return (
    <div className={clsx('group/hoverInfoGroup', className)}>
      <div className="block">{getIcon()}</div>
      <HoverInfo info={variableType} />
    </div>
  )
}
