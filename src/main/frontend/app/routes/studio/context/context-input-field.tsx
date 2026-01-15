// ContextInputField.tsx
import React from 'react'
import Toggle from '~/components/inputs/toggle'

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
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        className="border-border bg-background focus:border-foreground-active focus:ring-foreground-active mt-1 w-full rounded-md border px-3 py-2 shadow-sm sm:text-sm"
      >
        <option value="">Select option…</option>
        {Object.keys(enumOptions).map((optKey) => (
          <option key={optKey} value={optKey}>
            {optKey}
          </option>
        ))}
      </select>
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
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        pattern="[0-9]*"
        className="border-border focus:border-foreground-active mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
      />
    )
  }

  // Default text input
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      onKeyDown={onKeyDown}
      className="border-border focus:border-foreground-active mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
    />
  )
}
