import React, { useEffect, useState } from 'react'
import clsx from 'clsx'

type ToggleProperties = {
  checked?: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'>

export default function Toggle({
  checked = false,
  onChange,
  disabled = false,
  className,
  ...properties
}: ToggleProperties) {
  const [isChecked, setIsChecked] = useState(checked)

  useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  const toggle = () => {
    if (disabled) return

    const next = !isChecked
    setIsChecked(next)
    onChange(next)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (event.key === 'Enter') {
      event.preventDefault()
      toggle()
    }
  }

  return (
    <div className="group inline-flex items-center">
      <label
        className={clsx(
          'relative inline-block h-6 w-12',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={toggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="peer sr-only"
          {...properties}
        />

        <span
          className={clsx(
            'absolute inset-0 rounded-full transition-colors duration-200 ease-in-out',
            isChecked ? 'bg-brand' : 'bg-border',
            'peer-focus-visible:ring-brand peer-focus-visible:ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
          )}
        />

        <span
          className={clsx(
            'bg-backdrop absolute top-1/2 h-5 w-5 rounded-full shadow-md',
            'transition-transform duration-200 ease-in-out',
            'group-hover:bg-hover',
            isChecked ? 'translate-x-6 -translate-y-1/2' : 'translate-x-1 -translate-y-1/2',
          )}
        />
      </label>
    </div>
  )
}
