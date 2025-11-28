import React, { useState } from 'react'
import clsx from 'clsx'

interface SwitchToggleProperties {
  options: [string, string] // Left and right labels
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export default function SwitchToggle({
  options,
  value,
  onChange,
  disabled = false,
  className,
}: Readonly<SwitchToggleProperties>) {
  const [selected, setSelected] = useState<string>(value ?? options[0])

  const handleToggle = () => {
    if (disabled) return
    const newValue = selected === options[0] ? options[1] : options[0]
    setSelected(newValue)
    onChange(newValue)
  }

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {/* Left label */}
      <span
        className={clsx(
          'text-sm font-medium',
          selected === options[0] ? 'text-foreground-active' : 'text-foreground-muted',
        )}
      >
        {options[0]}
      </span>

      {/* Toggle container */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={clsx(
          'bg-brand relative inline-flex h-6 w-12 items-center rounded-full p-0.5',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <span
          className={clsx(
            'bg-background absolute h-5 w-5 rounded-full shadow transition-transform duration-200 ease-in-out',
            selected === options[0] ? 'translate-x-0' : 'translate-x-6',
          )}
        />
      </button>

      {/* Right label */}
      <span
        className={clsx(
          'text-sm font-medium',
          selected === options[1] ? 'text-foreground-active' : 'text-foreground-muted',
        )}
      >
        {options[1]}
      </span>
    </div>
  )
}
