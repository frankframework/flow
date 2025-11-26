import React, { useState } from 'react'
import HelpIcon from '/icons/solar/Help.svg?react'
import { useJavadocTransform } from '@frankframework/ff-doc/react'

export interface ContextInputProperties {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  label?: string
  attribute?: {
    [key: string]: any
    mandatory?: boolean
    description?: string
    type?: string
    enum?: string
  }
  enumOptions?: Record<string, string> | undefined
  elements?: Record<string, any> | null
}

export default function ContextInput({
  value,
  onChange,
  onKeyDown,
  label,
  attribute,
  enumOptions,
  elements,
}: Readonly<ContextInputProperties>) {
  const type = attribute?.type
  const description = attribute?.description
  const required = attribute?.mandatory

  const renderInputField = () => {
    if (enumOptions) {
      return (
        <select
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

    if (type === 'bool') {
      return (
        <select
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          className="border-border bg-background focus:border-foreground-active focus:ring-foreground-active mt-1 w-full rounded-md border px-3 py-2 shadow-sm sm:text-sm"
        >
          <option value="">Select…</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      )
    }

    if (type === 'int') {
      return (
        <input
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

    return (
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        className="border-border focus:border-foreground-active mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:ring-0 focus:outline-none sm:text-sm"
      />
    )
  }

  return (
    <label className="group font-small text-foreground relative block text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {required && <span className="text-red-500">*</span>}
          <span>{label}</span>
          {description && <DescriptionHelpIcon description={description} elements={elements ?? null} />}
        </div>
      </div>
      {renderInputField()}
    </label>
  )
}

function DescriptionHelpIcon({
  description,
  elements,
}: Readonly<{ description: string; elements: Record<string, any> | null }>) {
  const [show, setShow] = useState(false)
  const transformed = useJavadocTransform(description, elements)

  return (
    <div className="relative inline-block px-2">
      <button
        type="button"
        onClick={() => setShow((previous) => !previous)}
        className="text-blue-500 hover:text-blue-700 focus:outline-none"
        title="Show help"
      >
        <HelpIcon className="h-auto w-[12px] fill-current" />
      </button>

      {show && (
        <div
          className="bg-background border-border absolute top-0 left-6 z-20 mt-0 w-84 rounded-md border px-3 py-2 text-sm shadow-lg"
          dangerouslySetInnerHTML={transformed}
        />
      )}
    </div>
  )
}
