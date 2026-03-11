import {useFFDoc, useJavadocTransform} from "@frankframework/doc-library-react";
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ElementDetails } from '~/types/ff-doc.types'
import { getFirstLabelGroup } from '~/utils/flow-utils'
import ExternalLinkIcon from '../../../../icons/solar/External Link.svg?react'

interface ElementHoverCardProps {
  anchorRect: DOMRect
  element: ElementDetails
  isLocked: boolean
  onComplete?: () => void
  onUnlock?: () => void
}

export default function ElementHoverCard({
  anchorRect,
  element,
  isLocked,
  onComplete,
  onUnlock,
}: ElementHoverCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [fillWidth, setFillWidth] = useState(0)
  const offset = 10 // distance between anchor and tooltip
  const [labelGroup, label] = getFirstLabelGroup(element.labels)
  const route = element.labels ? [labelGroup, label, element.name].join('/') : element.className
  const frankdocUrl = `https://frankdoc.frankframework.org/#/${route}`
  const { elements } = useFFDoc()
  const description = useJavadocTransform(element.description ?? '', elements, false, (link) => {
    return `<a href="https://frankdoc.frankframework.org/#/${link.href}" target="_blank">${link.text}</a>`
  })

  useLayoutEffect(() => {
    if (!ref.current || !anchorRect) return

    const tooltip = ref.current
    const tooltipHeight = tooltip.offsetHeight
    const tooltipWidth = tooltip.offsetWidth

    const viewportHeight = window.innerHeight
    const margin = 8 // space from top/bottom of screen

    // Desired centered position
    const centeredTop = anchorRect.top + anchorRect.height / 2 - tooltipHeight / 2

    // Clamp within viewport
    const clampedTop = Math.min(Math.max(centeredTop, margin), viewportHeight - tooltipHeight - margin)

    const left = anchorRect.left - tooltipWidth - offset

    setPosition({
      top: clampedTop,
      left,
    })
  }, [anchorRect])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFillWidth(100)
    }, 50)
    return () => clearTimeout(timeout)
  }, [onComplete])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isLocked) return
      if (!ref.current) return

      if (!ref.current.contains(event.target as Node)) {
        onUnlock?.()
      }
    }

    document.addEventListener('pointerdown', handleClickOutside, true)

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true)
    }
  }, [isLocked, onUnlock])

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left - offset,
        pointerEvents: isLocked ? 'auto' : 'none',
        zIndex: 50,
      }}
      className="border-border bg-background flex max-h-[70vh] max-w-[40vw] flex-col rounded-md border text-sm shadow-lg"
    >
      <div className="bg-backdrop h-[4px] w-full flex-shrink-0">
        <div
          className="bg-foreground-active h-full transition-all duration-1000 ease-linear"
          style={{ width: `${fillWidth}%` }}
          onTransitionEnd={() => {
            if (fillWidth === 100) {
              onComplete?.()
            }
          }}
        />
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto p-5">
        <p className="text-foreground-muted">{element.labels.Components}</p>
        <h2 className="mb-2 font-semibold">
          <a
            href={frankdocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground-active hover:underline"
          >
            {element.name}
            <ExternalLinkIcon className="ml-3 inline h-4 w-4" />
          </a>
        </h2>
        <div className="py-2">
          {element.deprecated && (
            <span
              key={'deprecated'}
              className="mr-1 rounded-full border border-[var(--label-border-deprecated)] bg-[var(--label-deprecated)] p-2"
            >
              Deprecated
            </span>
          )}
          {element.labels &&
            Object.entries(element.labels).map(([key, value]) => (
              <span
                key={key}
                className={'mr-1 rounded-full border p-2'}
                style={{
                  backgroundColor: `var(--label-${key.toLowerCase()})`,
                  borderColor: `var(--label-border-${key.toLowerCase()})`,
                }}
              >
                {value}
              </span>
            ))}
        </div>
        {element.description && <p className="text-sm" dangerouslySetInnerHTML={description} />}
      </div>
    </div>,
    document.body,
  )
}
