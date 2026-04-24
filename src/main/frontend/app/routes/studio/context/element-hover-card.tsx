import type { ElementDetails } from '@frankframework/doc-library-core'
import { useFFDoc, useJavadocTransform } from '@frankframework/doc-library-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { frankdocChipStyle, getFirstLabelGroup } from '~/utils/flow-utils'
import ExternalLinkIcon from '../../../../icons/solar/External Link.svg?react'

interface ElementHoverCardProps {
  anchorRect: DOMRect
  element: ElementDetails
  isLocked: boolean
  onComplete?: () => void
  onUnlock?: () => void
  onEnter?: () => void
  onLeave?: () => void
}

export default function ElementHoverCard({
  anchorRect,
  element,
  onComplete,
  onUnlock,
  onEnter,
  onLeave,
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
    return `<a href="https://frankdoc.frankframework.org/#/${link.href}" target="_blank" class="underline hover:opacity-70">${link.text}</a>`
  })

  useLayoutEffect(() => {
    if (!ref.current || !anchorRect) return

    const tooltip = ref.current
    const tooltipHeight = tooltip.offsetHeight
    const tooltipWidth = tooltip.offsetWidth

    const viewportHeight = window.innerHeight
    const margin = 8

    const centeredTop = anchorRect.top + anchorRect.height / 2 - tooltipHeight / 2
    const clampedTop = Math.min(Math.max(centeredTop, margin), viewportHeight - tooltipHeight - margin)
    const left = anchorRect.left - tooltipWidth - offset

    setPosition({ top: clampedTop, left })
  }, [anchorRect])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFillWidth(100)
    }, 50)
    return () => clearTimeout(timeout)
  }, [onComplete])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(event.target as Node)) {
        onUnlock?.()
      }
    }

    document.addEventListener('pointerdown', handleClickOutside, true)
    return () => document.removeEventListener('pointerdown', handleClickOutside, true)
  }, [onUnlock])

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left - offset,
        pointerEvents: 'auto',
        zIndex: 50,
        minWidth: '380px',
      }}
      className="border-border bg-background flex max-h-[70vh] max-w-[50vw] flex-col rounded-md border text-sm shadow-xl"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="bg-backdrop h-1 w-full shrink-0 overflow-hidden rounded-t-md">
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

      <div className="flex-1 overflow-x-auto overflow-y-auto px-4 pt-3 pb-4">
        {/* Header: left = breadcrumb + name; right = FrankDoc link fills the full height */}
        <div className="mb-3 flex items-stretch justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-foreground-muted mb-0.5 text-[11px] tracking-wide uppercase">
              {element.labels.Components}
            </p>
            <h2 className="text-base leading-snug font-semibold">{element.name}</h2>
          </div>
          <a
            href={frankdocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border bg-backdrop hover:border-foreground-active hover:text-foreground-active flex shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded border px-3 text-xs transition-colors"
          >
            <ExternalLinkIcon className="mt-1 h-3.5 w-3.5" />
            <span>FrankDoc</span>
          </a>
        </div>

        {/* Labels / tags — Angular-style key:value chips */}
        {(element.deprecated || (element.labels && Object.keys(element.labels).length > 0)) && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {element.deprecated && (
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]"
                style={{ backgroundColor: 'rgb(30 30 30 / 0.2)', borderColor: 'rgb(30 30 30)' }}
              >
                Deprecated
              </span>
            )}
            {element.labels &&
              Object.entries(element.labels)
                .toSorted(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]"
                    style={frankdocChipStyle(key)}
                  >
                    {value}
                  </span>
                ))}
          </div>
        )}

        {/* Description */}
        {element.description && (
          <div
            className="text-foreground-muted prose-sm [&_code]:bg-backdrop text-[12px] leading-relaxed [&_a]:underline [&_a]:opacity-80 [&_a:hover]:opacity-100 [&_code]:rounded [&_code]:px-1 [&_code]:font-mono"
            dangerouslySetInnerHTML={description}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}
