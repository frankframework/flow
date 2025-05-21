import { useEffect, useId, useState } from 'react'
import clsx from 'clsx'
import RadioButton, { type RadioButtonProperties } from '~/components/inputs/radio-button'
import InputWithLabel from '~/components/inputs/input-with-label'

type RadioLabel = Record<string, string> | string
type RadioOptions = Record<string, RadioLabel>

type RadioListProperties = {
  options: RadioOptions
  onChange: (value: string) => void
  value?: string
  className?: string
  id?: string
} & Omit<RadioButtonProperties, 'onChange' | 'checked'>

export default function RadioList({
  options,
  onChange,
  value,
  className,
  id,
  ...properties
}: Readonly<RadioListProperties>) {
  const uniqueId = id ?? useId()
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value)

  const optionsArray = Object.keys(options)

  useEffect(() => {
    setSelectedValue(value)
  }, [value])

  const handleOptionChange = (optionValue: string) => {
    setSelectedValue(optionValue)
    onChange(optionValue)
  }

  return (
    <div className={clsx('flex flex-col gap-2', className)} role="radiogroup">
      {optionsArray.length > 0 ? (
        Object.entries(options).map(([optionValue, optionData]) => {
          const isSelected = selectedValue === optionValue
          const [label, description] =
            typeof optionData === 'string' ? [optionData, undefined] : Object.entries(optionData)[0]
          return (
            <div key={optionValue} className={clsx('py-1')}>
              <InputWithLabel htmlFor={`${uniqueId}-${optionValue}`} label={label} description={description}>
                <RadioButton
                  id={`${uniqueId}-${optionValue}`}
                  role="radio"
                  checked={isSelected}
                  name={uniqueId}
                  value={optionValue}
                  onChange={() => handleOptionChange(optionValue)}
                  {...properties}
                />
              </InputWithLabel>
            </div>
          )
        })
      ) : (
        <div className="text-sm text-gray-400">No options available</div>
      )}
    </div>
  )
}
