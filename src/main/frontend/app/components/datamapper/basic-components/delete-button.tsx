import clsx from 'clsx'

export default function DeleteButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx(
        'text-3xl font-bold text-[var(--color-error)] drop-shadow-[0_0_1px_black] hover:opacity-80',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      &times;
    </button>
  )
}
