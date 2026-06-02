import React from 'react'
import Dropdown from '~/components/inputs/dropdown'
import Toggle from '~/components/inputs/toggle'
import ValidatedInput from '~/components/inputs/validatedInput'
import Input from '~/components/inputs/input'

interface ContextInputFieldProperties {
  id: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  type?: string
  enumOptions?: Record<string, string> | undefined
}

export default function ContextInputField({
  id,
  value,
  onChange,
  onKeyDown,
  type,
  enumOptions,
}: Readonly<ContextInputFieldProperties>) {
  // Render enum dropdown
  if (enumOptions) {
    return (
      <Dropdown
        id={id}
        value={value}
        onChange={onChange}
        options={Object.fromEntries(Object.keys(enumOptions).map((key) => [key, key]))}
        placeholder="Select option…"
        className="mt-1"
      />
    )
  }

  // Render boolean dropdown
  if (type === 'bool') {
    const checked = value === 'true'
    return <Toggle checked={checked} onChange={(checked) => onChange(checked.toString())} className="mt-1" />
  }

  // Render integer-only input
  if (type === 'int') {
    return (
      <div className="relative mt-1">
        <ValidatedInput
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          patterns={{
            'Must be a whole number': /^\d+$/,
          }}
        />
      </div>
    )
  }

  // Default text input
  return (
    <Input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      onKeyDown={onKeyDown}
      wrapperClassName="mt-1"
    />
  )
}
