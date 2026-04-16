import { createPortal } from 'react-dom'
import Button from '../inputs/button'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchConfigurationCached, saveConfiguration, clearConfigurationCache } from '~/services/configuration-service'
import { useProjectStore } from '~/stores/project-store'
import { showErrorToast } from '~/components/toast'
import { refreshOpenDiffs } from '~/services/git-service'
import useEditorTabStore from '~/stores/editor-tab-store'
import { useFFDoc } from '@frankframework/doc-library-react'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'
import { parseXsd, getFirstLevelElementsForType } from '~/utils/xsd-utils'
import ContextInput from '~/routes/studio/context/context-input'
import type { Attribute, ElementDetails, FFDocJson } from '@frankframework/doc-library-core'
import { NON_CANVAS_ELEMENTS } from '~/routes/studio/context/palette-config'

interface NonCanvasElement {
  tagName: string
  attributeValues: Record<string, string>
  domChildren: Element[]
}

interface ElementPickerProps {
  validTypes: string[]
  onSelect: (tagName: string) => void
  onCancel: () => void
}

interface AttributeEditorProps {
  element: NonCanvasElement
  schema: Record<string, Attribute> | undefined
  ffDoc: FFDocJson | null
  elements: Record<string, ElementDetails> | null
  onChange: (updated: NonCanvasElement) => void
}

interface NonCanvasElementsModalProps {
  isOpen: boolean
  onClose: () => void
  configurationPath: string
}

const EXCLUDED_TAGS = new Set(['adapter', ...NON_CANVAS_ELEMENTS.map((t) => t.toLowerCase())])

function isExcluded(tagName: string): boolean {
  return tagName.startsWith('flow:') || EXCLUDED_TAGS.has(tagName.toLowerCase())
}

function parseNonCanvasElements(xmlString: string): NonCanvasElement[] {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml')
  const result: NonCanvasElement[] = []

  for (const child of doc.documentElement.children) {
    if (isExcluded(child.tagName)) continue

    const attributeValues: Record<string, string> = {}
    for (const attribute of child.attributes) {
      attributeValues[attribute.name] = attribute.value
    }

    result.push({
      tagName: child.tagName,
      attributeValues,
      domChildren: [...child.children],
    })
  }

  return result
}

function serializeToXml(originalXml: string, elements: NonCanvasElement[]): string {
  const doc = new DOMParser().parseFromString(originalXml, 'text/xml')
  const root = doc.documentElement

  for (const child of root.children) {
    if (!isExcluded(child.tagName)) {
      child.remove()
    }
  }

  const firstAdapter = root.querySelector('Adapter, adapter')

  for (const element of elements) {
    const newElement = doc.createElement(element.tagName)

    for (const [key, value] of Object.entries(element.attributeValues)) {
      if (value !== '') newElement.setAttribute(key, value)
    }

    for (const domChild of element.domChildren) {
      newElement.append(doc.importNode(domChild, true))
    }

    if (firstAdapter) {
      firstAdapter.before(newElement)
    } else {
      root.append(newElement)
    }
  }

  return new XMLSerializer().serializeToString(doc).replace(/^<\?xml[^?]*\?>\s*/, '')
}

function isMandatoryFilled(el: NonCanvasElement, schema: Record<string, Attribute> | undefined): boolean {
  if (!schema) return true

  for (const [key, attr] of Object.entries(schema)) {
    if (!attr.mandatory) continue

    const value = el.attributeValues[key] ?? ''
    if (value.trim() === '') return false
  }

  return true
}

function ElementPicker({ validTypes, onSelect, onCancel }: ElementPickerProps) {
  const [search, setSearch] = useState('')
  const [highlighted, setHighlighted] = useState<string>(validTypes[0] ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(
    () => validTypes.filter((t) => t.toLowerCase().includes(search.toLowerCase())),
    [validTypes, search],
  )

  useEffect(() => {
    if (!filtered.includes(highlighted)) setHighlighted(filtered[0] ?? '')
  }, [filtered, highlighted])

  const move = (dir: 1 | -1) => {
    const idx = filtered.indexOf(highlighted)
    const next = filtered[Math.max(0, Math.min(filtered.length - 1, idx + dir))]
    if (next) setHighlighted(next)
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search element type…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && highlighted) onSelect(highlighted)
          else
            switch (e.key) {
              case 'Escape': {
                onCancel()
                break
              }
              case 'ArrowDown': {
                e.preventDefault()
                move(1)
                break
              }
              case 'ArrowUp': {
                e.preventDefault()
                move(-1)
                break
              }
            }
        }}
        className="border-border focus:ring-foreground-active w-full rounded border px-2 py-1 text-sm focus:ring focus:outline-none"
      />
      <ul className="border-border max-h-48 overflow-y-auto rounded border">
        {filtered.length === 0 ? (
          <li className="text-muted-foreground px-3 py-2 text-sm">No results</li>
        ) : (
          filtered.map((type) => (
            <li
              key={type}
              onClick={() => onSelect(type)}
              className={`cursor-pointer px-3 py-1.5 text-sm ${
                highlighted === type ? 'bg-foreground-active text-background' : 'hover:bg-foreground-active/10'
              }`}
            >
              {type}
            </li>
          ))
        )}
      </ul>
      <Button onClick={onCancel} className="py-1 text-sm">
        Cancel
      </Button>
    </div>
  )
}

function AttributeEditor({ element, schema, ffDoc, elements, onChange }: AttributeEditorProps) {
  const [showAll, setShowAll] = useState(false)

  const allSchemaKeys = useMemo(() => (schema ? Object.keys(schema) : []), [schema])

  const getValue = (key: string) => element.attributeValues[key] ?? ''
  const setValue = (key: string, value: string) =>
    onChange({ ...element, attributeValues: { ...element.attributeValues, [key]: value } })

  const extraKeys = Object.keys(element.attributeValues).filter((k) => !allSchemaKeys.includes(k))

  const makeEnumOptions = (attribute: Attribute): Record<string, string> | undefined => {
    if (attribute.enum && ffDoc?.enums?.[attribute.enum]) {
      return Object.fromEntries(Object.keys(ffDoc.enums[attribute.enum]).map((k) => [k, k] as [string, string]))
    }
  }

  const { mandatory, filled, rest } = useMemo(() => {
    const mandatory: string[] = []
    const filled: string[] = []
    const rest: string[] = []

    for (const key of allSchemaKeys) {
      const attr = schema![key]
      if (attr.mandatory) mandatory.push(key)
      else if ((element.attributeValues[key] ?? '') === '') {
        rest.push(key)
      } else {
        filled.push(key)
      }
    }

    return { mandatory, filled, rest }
  }, [allSchemaKeys, schema, element.attributeValues])

  const visibleSchemaKeys = [...mandatory, ...filled, ...(showAll ? rest : [])]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{element.tagName}</p>

        {visibleSchemaKeys.map((key) => (
          <ContextInput
            key={key}
            id={`attr-${key}`}
            label={key}
            value={getValue(key)}
            attribute={schema![key]}
            enumOptions={makeEnumOptions(schema![key])}
            elements={elements ?? undefined}
            onChange={(value) => setValue(key, value)}
          />
        ))}

        {extraKeys.length > 0 && (
          <div className="border-border border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">Additional attributes</p>
            {extraKeys.map((key) => (
              <div key={key} className="mb-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-foreground text-sm">{key}</label>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...element.attributeValues }
                      delete updated[key]
                      onChange({ ...element, attributeValues: updated })
                    }}
                    className="cursor-pointer text-xs text-red-500 hover:text-red-700"
                  >
                    &times;
                  </button>
                </div>
                <input
                  type="text"
                  value={getValue(key)}
                  onChange={(e) => setValue(key, e.target.value)}
                  className="border-border focus:ring-foreground-active w-full rounded border px-2 py-1 text-sm focus:ring focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {element.domChildren.length > 0 && (
          <div className="border-border border-t pt-3">
            <p className="text-muted-foreground mb-1 text-xs font-medium">Child elements (preserved)</p>
            <ul className="space-y-1">
              {element.domChildren.map((child, i) => (
                <li key={i} className="bg-background text-foreground-muted rounded px-2 py-1 font-mono text-xs">
                  &lt;{child.tagName}
                  {child.getAttribute('name') ? ` name="${child.getAttribute('name')}"` : ''} /&gt;
                </li>
              ))}
            </ul>
          </div>
        )}

        {rest.length > 0 && schema && (
          <Button onClick={() => setShowAll((p) => !p)} className="w-full py-1 text-sm">
            {showAll ? 'Hide empty attributes' : `Show all attributes (${rest.length} more)`}
          </Button>
        )}
      </div>
    </div>
  )
}

function ManualTypeInput({ onAdd, onCancel }: { onAdd: (t: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="flex gap-1">
      <input
        type="text"
        autoFocus
        placeholder="e.g. IbisJob"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onAdd(value.trim())
          if (e.key === 'Escape') onCancel()
        }}
        className="border-border focus:ring-foreground-active flex-1 rounded border px-2 py-1 text-sm focus:ring focus:outline-none"
      />
      <Button onClick={() => value.trim() && onAdd(value.trim())} className="px-2 py-1 text-sm">
        Add
      </Button>
    </div>
  )
}

export default function NonCanvasElementsModal({ isOpen, onClose, configurationPath }: NonCanvasElementsModalProps) {
  const project = useProjectStore((state) => state.project)
  const { elements: ffElements, ffDoc: ffDocData } = useFFDoc()
  const { xsdContent } = useFrankConfigXsd()

  const [elements, setElements] = useState<NonCanvasElement[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isPickingType, setIsPickingType] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [originalXml, setOriginalXml] = useState('')

  const validTypes = useMemo<string[]>(() => {
    if (!xsdContent || !ffElements) return []

    const xsdDoc = parseXsd(xsdContent)

    const canvasSet = new Set([
      ...getFirstLevelElementsForType(xsdDoc, 'PipelineType'),
      ...getFirstLevelElementsForType(xsdDoc, 'ReceiverType'),
      'Adapter',
      'Receiver',
      'Exit',
      ...NON_CANVAS_ELEMENTS,
    ])

    const rootChildren = getFirstLevelElementsForType(xsdDoc, 'ConfigurationType')

    return rootChildren
      .filter((name) => !canvasSet.has(name) && !name.startsWith('flow:') && ffElements[name] != null)
      .toSorted((a, b) => a.localeCompare(b))
  }, [xsdContent, ffElements])

  const load = useCallback(async () => {
    if (!project || !configurationPath) return

    try {
      clearConfigurationCache(project.name, configurationPath)
      const xml = await fetchConfigurationCached(project.name, configurationPath)
      setOriginalXml(xml)
      setElements(parseNonCanvasElements(xml))
      setSelectedIndex(null)
      setIsPickingType(false)
    } catch (error) {
      showErrorToast(`Failed to load configuration: ${error instanceof Error ? error.message : error}`)
    }
  }, [project, configurationPath])

  useEffect(() => {
    if (isOpen) void load()
  }, [isOpen, load])

  const elementValidity = useMemo(
    () => elements.map((el) => isMandatoryFilled(el, ffElements?.[el.tagName]?.attributes)),
    [elements, ffElements],
  )

  const canSave = !isSaving && elementValidity.every(Boolean)

  const handleAddElement = (tagName: string) => {
    setElements((previous) => {
      const next = [...previous, { tagName, attributeValues: {}, domChildren: [] }]
      setSelectedIndex(next.length - 1)
      return next
    })

    setIsPickingType(false)
  }

  const handleDeleteElement = (index: number) => {
    setElements((previous) => previous.filter((_, i) => i !== index))
    setSelectedIndex((previous) => {
      if (previous === null || previous === index) return null
      return previous > index ? previous - 1 : previous
    })
  }

  const handleUpdate = (index: number, updated: NonCanvasElement) =>
    setElements((prev) => prev.map((el, i) => (i === index ? updated : el)))

  const handleSave = async () => {
    if (!project || !configurationPath || !canSave) return
    setIsSaving(true)

    try {
      const updatedXml = serializeToXml(originalXml, elements)
      await saveConfiguration(project.name, configurationPath, updatedXml)
      clearConfigurationCache(project.name, configurationPath)
      useEditorTabStore.getState().refreshAllTabs()

      if (project.isGitRepository) await refreshOpenDiffs(project.name)

      onClose()
    } catch (error) {
      showErrorToast(`Failed to save: ${error instanceof Error ? error.message : error}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const selected = selectedIndex === null ? null : elements[selectedIndex]
  const selectedSchema =
    selected && ffElements?.[selected.tagName] ? ffElements[selected.tagName].attributes : undefined

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-background border-border relative flex h-3/4 w-3/4 max-w-5xl flex-col rounded-lg border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-border flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold">Configure Non-Canvas Elements</h2>
          <Button onClick={onClose} className="px-2 py-1 text-lg leading-none">
            &times;
          </Button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="border-r-border flex w-80 flex-shrink-0 flex-col border-r">
            <div className="border-b-border flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">Elements</span>
              <Button
                onClick={() => {
                  setIsPickingType((p) => !p)
                  if (!isPickingType) setSelectedIndex(null)
                }}
                className="px-2 py-0.5 text-sm"
                title="Add element"
              >
                + Add
              </Button>
            </div>

            {isPickingType && (
              <div className="border-b-border border-b">
                {validTypes.length > 0 ? (
                  <ElementPicker
                    validTypes={validTypes}
                    onSelect={handleAddElement}
                    onCancel={() => setIsPickingType(false)}
                  />
                ) : (
                  <div className="p-3">
                    <p className="text-muted-foreground mb-2 text-xs">No types resolved from XSD — enter manually:</p>
                    <ManualTypeInput onAdd={handleAddElement} onCancel={() => setIsPickingType(false)} />
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {elements.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">
                  No non-canvas elements found. Click &ldquo;+ Add&rdquo; to create one.
                </p>
              ) : (
                <ul>
                  {elements.map((el, index) => {
                    const isSelected = selectedIndex === index
                    const valid = elementValidity[index] ?? true
                    let dotClass = 'bg-transparent'
                    if (!valid) dotClass = isSelected ? 'bg-background' : 'bg-red-500'
                    return (
                      <li
                        key={index}
                        onClick={() => {
                          setSelectedIndex(index)
                          setIsPickingType(false)
                        }}
                        className={`group flex cursor-pointer items-center gap-2 px-3 py-2 ${
                          isSelected ? 'bg-foreground-active text-background' : 'hover:bg-foreground-active/10'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClass}`}
                          title={valid ? undefined : 'Required attributes missing'}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{el.tagName}</div>
                          {el.attributeValues.name && (
                            <div
                              className={`truncate text-xs ${isSelected ? 'text-background/70' : 'text-foreground-muted'}`}
                            >
                              {el.attributeValues.name}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteElement(index)
                          }}
                          className={`flex-shrink-0 cursor-pointer text-base opacity-0 group-hover:opacity-100 ${
                            isSelected ? 'text-background/70 hover:text-background' : 'text-red-500 hover:text-red-700'
                          }`}
                          title="Delete"
                        >
                          &times;
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {selected !== null && selectedIndex !== null ? (
              <AttributeEditor
                key={`${selectedIndex}-${selected.tagName}`}
                element={selected}
                schema={selectedSchema}
                ffDoc={ffDocData}
                elements={ffElements}
                onChange={(updated) => handleUpdate(selectedIndex, updated)}
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center p-8 text-center text-sm">
                {isPickingType ? (
                  <span>Choose an element type from the picker above.</span>
                ) : (
                  <span>
                    Select an element from the list, or click <strong>+ Add</strong> to create one.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t-border flex items-center justify-between border-t px-5 py-3">
          <span className="text-muted-foreground text-xs">
            {!canSave && !isSaving && 'Fill in all required (*) attributes before saving.'}
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
