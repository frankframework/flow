import clsx from 'clsx'
import React from 'react'

export type InputProperties = {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  value?: string
  placeholder?: string
  className?: string
  disabled?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'placeholder' | 'className' | 'disabled'>

export default function Input({ className, onChange, value, disabled = false, ...properties }: InputProperties) {
  return (
    <div
      className={clsx(
        'inline-block w-full rounded-md border border-border',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        className={clsx(
          'w-full rounded-sm border-b-[2px] border-transparent px-3 py-2 text-text outline-none focus:border-b-brand sm:text-sm',
          disabled && 'cursor-not-allowed',
          className,
        )}
        onChange={onChange}
        value={value}
        disabled={disabled}
        {...properties}
      />
    </div>
  )
}
