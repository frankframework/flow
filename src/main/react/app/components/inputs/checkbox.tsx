import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import CheckSquareIcon from '/icons/custom/Check.svg?react'

type CheckboxProperties = {
  checked?: boolean
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'disabled'>

export default function Checkbox({
  checked = false,
  disabled = false,
  onChange,
  className,
  ...properties
}: CheckboxProperties) {
  const [isChecked, setIsChecked] = useState(checked)

  useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      setIsChecked(event.target.checked)
      onChange(event)
    }
  }

  return (
    <div className={clsx('flex items-start gap-3', disabled && 'opacity-50', className)}>
      <div className="relative flex aspect-square h-6 items-center">
        <input
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
          className={clsx(
            'peer h-full w-full appearance-none rounded-md border border-gray-200 checked:border-[var(--color-brand)] checked:bg-[var(--color-brand)]',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
          {...properties}
        />
        <CheckSquareIcon className="pointer-events-none absolute left-0 h-full w-full fill-white opacity-0 peer-checked:opacity-100" />
      </div>
    </div>
  )
}
