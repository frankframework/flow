import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import CheckSquareIcon from '/icons/custom/Check.svg?react'

type CheckboxProperties = {
  checked?: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

export default function Checkbox({ checked = false, onChange, className, ...properties }: CheckboxProperties) {
  const [isChecked, setIsChecked] = useState(checked)

  useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked)
    onChange(event)
  }

  return (
    <div className={clsx('flex items-start gap-3', className)}>
      <div className="relative flex h-5 items-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-200 transition-colors checked:border-[var(--color-brand)] checked:bg-[var(--color-brand)]"
          {...properties}
        />
        <CheckSquareIcon className="pointer-events-none absolute left-0 h-5 w-5 fill-white opacity-0 peer-checked:opacity-100" />
      </div>
    </div>
  )
}
