import clsx from 'clsx'
import TextCircle from '/icons/solar/Text circle.svg?react'

export default function EditButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx('drop-shadow-[0_0_1px_black] hover:opacity-70', className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <TextCircle className="h-6" />
    </button>
  )
}
