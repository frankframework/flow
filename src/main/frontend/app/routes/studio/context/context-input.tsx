import React, { useState } from 'react'
import HelpIcon from '/icons/solar/Help.svg?react'
import { useJavadocTransform } from '@frankframework/ff-doc/react'
import ContextInputField from './context-input-field'

export interface ContextInputProperties {
  id: string
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
  id,
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

  return (
    <div className="group font-small text-foreground relative block text-sm">
      <div className="flex items-center gap-2">
        {required && <span className="text-red-500">*</span>}
        <label htmlFor={id}>{label}</label>
        {description && <DescriptionHelpIcon description={description} elements={elements ?? null} />}
      </div>

      <ContextInputField
        id={id}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        type={type}
        enumOptions={enumOptions}
      />
    </div>
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
        tabIndex={-1}
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
