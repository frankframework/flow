import clsx from 'clsx'
import TextCircle from '/icons/solar/Text Circle.svg?react'

export default function EditButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx('hover:opacity-70', className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <TextCircle className="fill-foreground h-6" />
    </button>
  )
}
