import clsx from 'clsx'
import LightBulb from '/icons/solar/Lightbulb.svg?react'

export default function HighlightButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx('drop-shadow-[0_0_1px_black] hover:opacity-70', className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <LightBulb className="fill-foreground h-6" />
    </button>
  )
}
