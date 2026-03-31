import clsx from 'clsx'
import LightBulb from '/icons/solar/Lightbulb.svg?react'

export default function HighlightButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={clsx('hover:opacity-70', className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <LightBulb className="hover:text-active fill-foreground h-6" />
    </button>
  )
}
