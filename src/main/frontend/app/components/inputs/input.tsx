import clsx from 'clsx'
import React from 'react'
import { twMerge } from 'tailwind-merge'

export type InputProperties = {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  value?: string
  placeholder?: string
  wrapperClassName?: string
  inputClassName?: string
  disabled?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'placeholder' | 'className' | 'disabled'>

export default function Input({
  wrapperClassName,
  inputClassName,
  onChange,
  value,
  disabled = false,
  ...properties
}: InputProperties) {
  return (
    <div
      className={twMerge(
        'border-border bg-backdrop hover:not-focus-within:bg-hover focus-within:bg-selected inline-block w-full rounded-md border',
        disabled && 'cursor-not-allowed opacity-50',
        wrapperClassName,
      )}
    >
      <input
        className={twMerge(
          'text-foreground focus:border-b-brand w-full rounded-sm border-b-[2px] border-transparent px-3 py-2 outline-none sm:text-sm',
          disabled && 'cursor-not-allowed',
          inputClassName,
        )}
        onChange={onChange}
        value={value}
        disabled={disabled}
        {...properties}
      />
    </div>
  )
}
