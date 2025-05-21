import RadioButton, { type RadioButtonProperties } from '~/components/inputs/radio-button'
import {useEffect, useState} from 'react'

type RadioOption = Record<string, string>
type RadioOptions = Record<string, RadioOption>

type RadioListProperties = {
  options: RadioOptions
  onChange: (value: string) => void
  value?: string
} & RadioButtonProperties

export default function RadioList({ options, onChange, value, ...properties }: Readonly<RadioListProperties>) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value)

  const optionsArray = Object.keys(options)


  useEffect(() => {
    setSelectedValue(value)
  }, [value])


  return (
    <div className="flex flex-col gap-2">
      {Object.entries(options).map(([key, option]) => (
        <RadioButton
          key={key}
          id={key}
          name={key}
          checked={value === key}
          onChange={(checked) => {
            if (checked) {
              onChange(key)
            }
          }}
          {...properties}
        >
          {option.label}
        </RadioButton>
      ))}
    </div>
  )
}
