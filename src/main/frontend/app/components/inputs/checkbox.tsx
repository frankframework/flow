import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import CheckSquareIcon from '/icons/custom/Check.svg?react'

export type CheckboxProperties = {
  checked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'disabled' | 'onChange' | 'checked'>

export default function Checkbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  className,
  ...properties
}: CheckboxProperties) {
  const [isChecked, setIsChecked] = useState(checked)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  const isActive = isChecked || indeterminate

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      const newChecked = event.target.checked
      onChange?.(newChecked)
      setIsChecked(newChecked)
    }
  }

  return (
    <div className={clsx('relative flex aspect-square h-4 items-center', disabled && 'opacity-50', className)}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        className={clsx(
          'peer border-border h-full w-full appearance-none rounded border',
          isActive ? 'border-brand bg-brand' : 'bg-backdrop',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
        {...properties}
      />
      <CheckSquareIcon className="fill-background pointer-events-none absolute left-0 h-full w-full opacity-0 peer-checked:opacity-100" />
      {indeterminate && !isChecked && (
        <div className="bg-background pointer-events-none absolute top-1/2 left-1/2 h-0.5 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded" />
      )}
    </div>
  )
}
