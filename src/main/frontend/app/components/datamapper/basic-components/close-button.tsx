import clsx from 'clsx'

export default function CloseButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx(
        'text-error text-3xl leading-none font-bold drop-shadow-[0_0_1px_black] hover:opacity-80',
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
