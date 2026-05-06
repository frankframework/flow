interface AdapterLocation {
  name: string
  offset: number
}

export interface FrankElementLocation {
  subtype: string
  name: string
  startLine: number
  adapterName: string
  adapterPosition: number
}

export function findAdaptersInXml(xml: string): AdapterLocation[] {
  const adapters: AdapterLocation[] = []
  const regex = /<adapter\b[^>]*\bname\s*=\s*"([^"]*)"/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    adapters.push({ name: match[1], offset: match.index })
  }
  return adapters
}

export function lineToOffset(xml: string, lineNumber: number): number {
  const lines = xml.split('\n')
  let offset = 0
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1
  }
  return offset
}

export function findAdapterIndexAtOffset(adapters: AdapterLocation[], cursorOffset: number): number {
  for (let i = adapters.length - 1; i >= 0; i--) {
    if (adapters[i].offset <= cursorOffset) return i
  }
  return 0
}

export function extractFlowElements(xml: string): string | null {
  const match = xml.match(/<flow:FlowElements[\s\S]*?<\/flow:FlowElements>/)
  return match ? match[0] : null
}

export function wrapFlowXml(fragment: string): string {
  const inner = fragment
    .replace(/^<flow:FlowElements[^>]*>/, '')
    .replace(/<\/flow:FlowElements>$/, '')
    .trim()

  return `<flow:FlowElements xmlns:flow="urn:frank-flow">${inner}</flow:FlowElements>`
}

export function findFlowElementsStartLine(xml: string): number {
  const lines = xml.split('\n')
  for (const [i, line] of lines.entries()) {
    if (line.includes('<flow:FlowElements')) return i + 1 // 1-based line numbers
  }
  return 1
}

export function findElementInXml(xml: string, subtype: string, name?: string): number | null {
  const lines = xml.split('\n')

  if (name) {
    for (const [i, line] of lines.entries()) {
      if (line.includes(`<${subtype}`) && line.includes(`name="${name}"`)) {
        return i + 1
      }
    }

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`<${subtype}`)) {
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          if (lines[j].includes(`name="${name}"`)) {
            return i + 1
          }
          if (/^\s*<[A-Za-z]/.test(lines[j])) break
        }
      }
    }
  }

  for (const [i, line] of lines.entries()) {
    if (line.includes(`<${subtype}`)) {
      return i + 1
    }
  }

  return null
}

export function findElementRangeInXml(
  xml: string,
  subtype: string,
  name?: string,
): { startLine: number; endLine: number } | null {
  const startLine = findElementInXml(xml, subtype, name)
  if (!startLine) return null

  const lines = xml.split('\n')
  const endLine = findOpenTagEndLine(lines, startLine - 1)
  return { startLine, endLine }
}

const STRUCTURAL_TAGS = new Set(['Adapter', 'Configuration', 'Module', 'Pipeline', 'Exits'])

function toPascalCase(tag: string): string {
  return tag[0].toUpperCase() + tag.slice(1)
}

function isStudioFlowNode(tag: string, parent: string): boolean {
  if (STRUCTURAL_TAGS.has(tag)) return false
  return (parent === 'adapter' && tag === 'Receiver') || (parent === 'pipeline' && tag !== 'Exit')
}

function findOpenTagEndLine(lines: string[], startIndex: number): number {
  let inString = false
  let stringChar = ''
  let foundOpen = false

  for (let i = startIndex; i < Math.min(startIndex + 50, lines.length); i++) {
    for (const ch of lines[i]) {
      if (!foundOpen) {
        if (ch === '<') foundOpen = true
        continue
      }
      if (inString) {
        if (ch === stringChar) inString = false
        continue
      }
      if (ch === '"' || ch === "'") {
        inString = true
        stringChar = ch
        continue
      }
      if (ch === '>') return i + 1
    }
  }

  return startIndex + 1
}

function isTagSelfClosing(lines: string[], lineIndex: number): boolean {
  for (let i = lineIndex; i < Math.min(lineIndex + 20, lines.length); i++) {
    if (lines[i].includes('/>')) return true
    if (/[^/]>\s*$/.test(lines[i])) return false
  }
  return false
}

function findNameNearLine(lines: string[], lineIndex: number): string | null {
  for (let i = lineIndex; i < Math.min(lineIndex + 15, lines.length); i++) {
    const nameMatch = lines[i].match(/\bname="([^"]*)"/)
    if (nameMatch) return nameMatch[1]
    if (lines[i].includes('/>') || (/[^/]>\s*$/.test(lines[i]) && i > lineIndex)) break
  }
  return null
}

function buildGlyphEntry(
  tag: string,
  lineIndex: number,
  lines: string[],
  xml: string,
  adapters: AdapterLocation[],
): FrankElementLocation | null {
  const name = findNameNearLine(lines, lineIndex)
  if (!name) return null

  const elementOffset = lineToOffset(xml, lineIndex + 1)
  const adapterIndex = findAdapterIndexAtOffset(adapters, elementOffset)
  const adapter = adapters[adapterIndex]
  if (!adapter || adapter.offset >= elementOffset) return null

  return { subtype: tag, name, startLine: lineIndex + 1, adapterName: adapter.name, adapterPosition: adapterIndex }
}

export function findFrankElementsForGlyphs(xml: string): FrankElementLocation[] {
  const lines = xml.split('\n')
  const adapters = findAdaptersInXml(xml)
  if (adapters.length === 0) return []

  const results: FrankElementLocation[] = []
  const tagStack: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    for (const { 1: tag } of line.matchAll(/<\/([A-Za-z][A-Za-z0-9]*)/g)) {
      const idx = tagStack.lastIndexOf(tag)
      if (idx !== -1) tagStack.splice(idx, 1)
    }

    const openMatch = line.match(/^\s*<([A-Za-z][A-Za-z0-9]*)[\s/>]/)
    if (!openMatch) continue

    const rawTag = openMatch[1]
    const tag = toPascalCase(rawTag)
    const parent = (tagStack.at(-1) ?? '').toLowerCase()

    if (isStudioFlowNode(tag, parent)) {
      const entry = buildGlyphEntry(tag, i, lines, xml, adapters)
      if (entry) results.push(entry)
    }

    if (!isTagSelfClosing(lines, i)) tagStack.push(rawTag)
  }

  return results
}
