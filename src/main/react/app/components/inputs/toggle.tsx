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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      const newIsChecked = event.target.checked
      setIsChecked(newIsChecked)
      onChange?.(newIsChecked)
    }
  }

  return (
    <div className="group flex items-center gap-2">
      <label className={clsx('relative inline-block h-6 w-12', disabled && 'cursor-not-allowed opacity-50', className)}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="absolute h-0 w-0 opacity-0"
          {...properties}
        />
        <span className={clsx('absolute inset-0 rounded-full', isChecked ? 'bg-brand' : 'bg-border')}>
          <span
            className={clsx(
              'bg-background group-hover:bg-hover absolute top-[50%] h-5 w-5 -translate-y-1/2 transform rounded-full',
              isChecked ? 'right-0.5' : 'left-0.5',
            )}
          />
        </span>
      </label>
    </div>
  )
}
