import clsx from 'clsx'
import TrashBinIcon from '/icons/solar/Trash Bin.svg?react'

export default function DeleteButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx('hover:opacity-70', className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <TrashBinIcon className="hover:text-error h-6" />
    </button>
  )
}
