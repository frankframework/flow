import clsx from 'clsx'

export default function EditButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx('text-lg drop-shadow-[0_0_1px_black] hover:opacity-70', className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      ✏️
      {/* <Settings className="fill-border" /> */}
    </button>
  )
}
