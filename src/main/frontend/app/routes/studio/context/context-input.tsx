import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import HelpIcon from '/icons/solar/Help.svg?react'
import DangerTriangle from '/icons/solar/Danger Triangle.svg?react'
import { useJavadocTransform } from '@frankframework/doc-library-react'
import ContextInputField from './context-input-field'
import type { Attribute, Elements } from '@frankframework/doc-library-core'
import type { DeprecatedInfo } from './deprecated-list-popover'
import { DeprecatedPopover } from '../canvas/nodetypes/components/deprecated-popover'

export type ContextInputProperties = {
  id: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  label?: string
  attribute?: Attribute
  enumOptions?: Record<string, string> | undefined
  elements?: Elements | null
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
  const deprecated = attribute?.deprecated

  return (
    <div className="group font-small text-foreground relative block text-sm">
      <div className="flex items-center gap-2">
        {required && <span className="text-red-500">*</span>}
        <label htmlFor={id} className={`${deprecated ? 'text-foreground-muted line-through' : 'text-foreground'}`}>
          {label}
        </label>
        {deprecated && <DeprecatedIcon deprecated={deprecated} />}
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

function DescriptionHelpIcon({ description, elements }: Readonly<{ description: string; elements: Elements | null }>) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [show, setShow] = useState(false)
  const transformed = useJavadocTransform(description, elements)

  const handleMouseEnter = () => {
    if (ref.current) {
      setAnchorRect(ref.current.getBoundingClientRect())
      setShow(true)
    }
  }

  const handleMouseLeave = () => {
    setShow(false)
  }

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex cursor-pointer"
      >
        <HelpIcon className="h-auto w-4 fill-current text-blue-500" />
      </div>
      {show &&
        anchorRect &&
        createPortal(
          <div
            className="bg-background text-foreground border-border fixed z-[9999] w-84 rounded-md border px-3 py-2 text-sm shadow-lg"
            style={{ top: anchorRect.top, left: anchorRect.right + 4 }}
            dangerouslySetInnerHTML={transformed}
          />,
          document.body,
        )}
    </>
  )
}

function DeprecatedIcon({ deprecated }: Readonly<{ deprecated: DeprecatedInfo }>) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [show, setShow] = useState(false)

  if (!deprecated) return null

  const handleMouseEnter = () => {
    if (ref.current) {
      setAnchorRect(ref.current.getBoundingClientRect())
      setShow(true)
    }
  }

  const handleMouseLeave = () => {
    setShow(false)
  }

  return (
    <>
      <div ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="inline-flex">
        <DangerTriangle className="text-error h-auto w-4 cursor-pointer fill-current" />
      </div>

      {show && <DeprecatedPopover deprecated={deprecated} anchorRect={anchorRect} />}
    </>
  )
}
