import clsx from 'clsx'

export default function HoverInfo({ className, info }: { className?: string; info: string }) {
  return (
    <span
      className={clsx(
        className,
        'absolute z-10 hidden -translate-y-15 rounded bg-neutral-950 px-2 py-1 text-sm text-white shadow-md group-hover/hoverInfoGroup:block',
      )}
    >
      {info}
    </span>
  )
}
