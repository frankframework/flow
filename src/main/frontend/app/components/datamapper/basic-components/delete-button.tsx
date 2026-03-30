import clsx from 'clsx'
import TrashBinIcon from '/icons/solar/Trash Bin.svg?react'

export default function DeleteButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx('drop-shadow-[0_0_1px_black] hover:opacity-70', className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <TrashBinIcon className="h-6" />
    </button>
  )
}
