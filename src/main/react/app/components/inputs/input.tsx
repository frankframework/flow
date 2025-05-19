import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import CheckSquareIcon from '/icons/solar/Check Square.svg?react'
import CloseSquareIcon from '/icons/solar/Close Square.svg?react'
import HelpIcon from '/icons/solar/Help.svg?react'

type BaseInputFieldProperties = {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  value?: string
  placeholder?: string
  patterns?: Record<string, RegExp>
  onValidChange?: (isValid: boolean) => void
} & React.InputHTMLAttributes<HTMLInputElement>

export default function Input({ onChange, patterns, value, onValidChange, ...properties }: BaseInputFieldProperties) {
  const [isValid, setIsValid] = useState(true)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
    validateInput(value ?? '')
  }, [value])

  useEffect(() => {
    onValidChange?.(isValid)
  }, [isValid, onValidChange])

  const validateInput = (inputValue: string) => {
    if (!patterns) {
      setIsValid(true)
      return
    }

    const newChecks: Record<string, boolean> = {}
    for (const [name, pattern] of Object.entries(patterns)) {
      newChecks[name] = pattern.test(inputValue)
    }
    const newIsValid = Object.keys(newChecks).length === 0 || Object.values(newChecks).every(Boolean)

    setChecks(newChecks)
    setIsValid(newIsValid)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setInputValue(newValue)
    validateInput(newValue)

    onChange(event)
  }

  return (
    <div className="relative">
      <div
        className={clsx(
          'inline-block w-full rounded-md border border-gray-200 pb-[1px] focus-within:border-b-[2px] focus-within:pb-0',
          isValid ? 'focus-within:border-b-[var(--color-brand)]' : 'border-b-red-500',
        )}
      >
        <input
          className="w-full border-transparent px-3 py-2 text-gray-900 outline-none sm:text-sm"
          onChange={handleChange}
          value={inputValue}
          {...properties}
        />
      </div>
      {patterns && (
        <div className="group absolute top-1/2 right-2 -translate-y-1/2">
          <HelpIcon className={clsx('fill-gray-200', isValid ? 'fill-[var(--color-brand)]' : 'fill-red-500')} />
          <span
            className={clsx(
              'absolute top-1/2 right-full z-10 mr-2 ml-2 hidden -translate-y-1/2 rounded bg-gray-950 px-2 py-1 text-sm whitespace-nowrap text-white shadow-md group-hover:block',
            )}
          >
            {Object.entries(checks).map(([check, satisfied]) => {
              const Icon = satisfied ? CheckSquareIcon : CloseSquareIcon
              return (
                <div key={check} className="flex items-center gap-1">
                  <Icon className={clsx('h-4 w-4', satisfied ? 'fill-green-500' : 'fill-red-500')} />
                  <span>{check}</span>
                </div>
              )
            })}
          </span>
        </div>
      )}
    </div>
  )
}
