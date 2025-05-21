import React, { useEffect, useId, useState } from 'react'
import clsx from 'clsx'

export type RadioButtonProperties = {
  checked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
  id?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'disabled' | 'onChange' | 'checked'>

export default function RadioButton({
  checked = false,
  disabled = false,
  onChange,
  className,
  id,
  ...properties
}: RadioButtonProperties) {
  const uniqueId = id ?? useId()
  const [isSelected, setIsSelected] = useState(checked)

  useEffect(() => {
    setIsSelected(checked)
  }, [checked])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      const newIsSelected = event.target.checked
      onChange?.(newIsSelected)
      setIsSelected(newIsSelected)
    }
  }

  return (
    <>
      <label
        className={clsx('relative flex cursor-pointer items-center select-none', disabled && 'opacity-50', className)}
      >
        <input
          id={uniqueId}
          name="radio"
          type="radio"
          disabled={disabled}
          onChange={handleChange}
          checked={isSelected}
          className={clsx('peer absolute h-0 w-0 opacity-0')}
          {...properties}
        />
        <span
          className={clsx(
            'relative mr-4 inline-block h-6 w-6 rounded-full border align-top peer-focus:border-[var(--color-pink-500)]',
            isSelected
              ? 'border-[var(--color-brand)] bg-[var(--color-brand)] shadow-[inset_0_0_0_2px_var(--color-white)]'
              : 'border-gray-200 bg-[var(--color-white)]',
          )}
        />
      </label>
    </>
  )
}
