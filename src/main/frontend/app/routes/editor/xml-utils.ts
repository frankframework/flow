export interface AdapterLocation {
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

const STRUCTURAL_TAGS = new Set([
  'Adapter',
  'Configuration',
  'Module',
  'Pipeline',
  'Exits',
  'Forwards',
  'Global-forwards',
  'GlobalForwards',
  'PipelinePart',
  'Root',
  'Scheduler',
])

const MAX_LOOKAHEAD_LINES = 15
const MAX_TAG_LINES = 50

const REGEX_ADAPTER = /<([A-Za-z0-9_:-]+:)?adapter\b[^>]*\bname\s*=\s*["']([^"']*)["']/gi
const REGEX_OPEN_TAG = /^\s*<([A-Za-z0-9_:-]+)/
const REGEX_CLOSE_TAG = /<\/([A-Za-z0-9_:-]+)>/g
const REGEX_NAME_ATTR = /\bname=["']([^"']*)["']/
const REGEX_FLOW_ELEMENTS = /<flow:FlowElements[\s\S]*?<\/flow:FlowElements>/
const REGEX_NEW_TAG_START = /^\s*<[A-Za-z]/

function getLocalName(tag: string): string {
  const colonIndex = tag.indexOf(':')
  return colonIndex === -1 ? tag : tag.slice(colonIndex + 1)
}

function toPascalCase(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1)
}

function analyzeTagStructure(lines: string[], startLine: number): { isSelfClosing: boolean; endLine: number } {
  let isInsideString = false
  let stringDelimiter = ''
  let isInsideTag = false
  let previousChar = ''

  const searchLimit = Math.min(startLine + MAX_TAG_LINES, lines.length)

  for (let currentLine = startLine; currentLine < searchLimit; currentLine++) {
    for (const char of lines[currentLine]) {
      if (!isInsideTag) {
        if (char === '<') isInsideTag = true
        continue
      }

      if (isInsideString) {
        if (char === stringDelimiter) isInsideString = false
        previousChar = char
        continue
      }

      if (char === '"' || char === "'") {
        isInsideString = true
        stringDelimiter = char
        previousChar = char
        continue
      }

      if (char === '>') {
        return { isSelfClosing: previousChar === '/', endLine: currentLine + 1 }
      }

      if (char.trim() !== '') {
        previousChar = char
      }
    }
  }

  return { isSelfClosing: false, endLine: startLine + 1 }
}

/**
 * Looks for a `name="…"` attribute within the next few lines after `lineIndex`.
 * Stops early when the tag clearly ends.
 */
function extractNameAttribute(lines: string[], startLine: number): string | null {
  const searchLimit = Math.min(startLine + MAX_LOOKAHEAD_LINES, lines.length)

  for (let i = startLine; i < searchLimit; i++) {
    const match = lines[i].match(REGEX_NAME_ATTR)
    if (match) return match[1]

    const isTagEnding = lines[i].includes('/>') || (/[^/]>\s*$/.test(lines[i]) && i > startLine)
    if (isTagEnding) break
  }

  return null
}

function hasNameAttributeWithinTag(lines: string[], startLine: number, targetName: string): boolean {
  const searchLimit = Math.min(startLine + MAX_LOOKAHEAD_LINES, lines.length)

  for (let i = startLine; i < searchLimit; i++) {
    if (lines[i].includes(`name="${targetName}"`) || lines[i].includes(`name='${targetName}'`)) {
      return true
    }

    if (i > startLine && REGEX_NEW_TAG_START.test(lines[i])) {
      return false
    }
  }
  return false
}

export function findAdaptersInXml(xml: string): AdapterLocation[] {
  const adapters: AdapterLocation[] = []
  let match: RegExpExecArray | null

  while ((match = REGEX_ADAPTER.exec(xml)) !== null) {
    adapters.push({ name: match[2], offset: match.index })
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
  const match = xml.match(REGEX_FLOW_ELEMENTS)
  return match ? match[0] : null
}

export function wrapFlowXml(fragment: string): string {
  const innerContent = fragment
    .replace(/^<flow:FlowElements[^>]*>/, '')
    .replace(/<\/flow:FlowElements>$/, '')
    .trim()

  return `<flow:FlowElements xmlns:flow="urn:frank-flow">${innerContent}</flow:FlowElements>`
}

export function findFlowElementsStartLine(xml: string): number {
  const lines = xml.split('\n')
  const index = lines.findIndex((line) => line.includes('<flow:FlowElements'))
  return index === -1 ? 1 : index + 1
}

export function findElementInXml(xml: string, subtype: string, name?: string): number | null {
  const lines = xml.split('\n')
  const targetTag = `<${subtype}`

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(targetTag)) continue

    if (!name) return i + 1

    if (hasNameAttributeWithinTag(lines, i, name)) {
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
  const { endLine } = analyzeTagStructure(lines, startLine - 1)

  return { startLine, endLine }
}

function isGlyphNode(tag: string, parentTag: string): boolean {
  if (STRUCTURAL_TAGS.has(tag)) return false
  return (parentTag === 'adapter' && tag === 'Receiver') || (parentTag === 'pipeline' && tag !== 'Exit')
}

function processClosingTags(line: string, stack: string[]) {
  for (const { 1: rawTag } of line.matchAll(REGEX_CLOSE_TAG)) {
    const tagName = getLocalName(rawTag)
    const index = stack.lastIndexOf(tagName)
    if (index !== -1) stack.length = index
  }
}

function createGlyphEntry(
  tag: string,
  lineIndex: number,
  lines: string[],
  xml: string,
  adapters: AdapterLocation[],
): FrankElementLocation | null {
  const name = extractNameAttribute(lines, lineIndex)
  if (!name) return null

  const elementOffset = lineToOffset(xml, lineIndex + 1)
  const adapterIndex = findAdapterIndexAtOffset(adapters, elementOffset)
  const adapter = adapters[adapterIndex]

  if (!adapter || adapter.offset >= elementOffset) return null

  return {
    subtype: tag,
    name,
    startLine: lineIndex + 1,
    adapterName: adapter.name,
    adapterPosition: adapterIndex,
  }
}

export function findFrankElementsForGlyphs(xml: string): FrankElementLocation[] {
  const adapters = findAdaptersInXml(xml)
  if (adapters.length === 0) return []

  const lines = xml.split('\n')
  const results: FrankElementLocation[] = []
  const tagStack: string[] = []

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]

    processClosingTags(line, tagStack)

    const openMatch = line.match(REGEX_OPEN_TAG)
    if (!openMatch) continue

    const rawTag = openMatch[1]
    const baseTagName = getLocalName(rawTag)
    const pascalTag = toPascalCase(baseTagName)
    const parentTag = (tagStack.at(-1) ?? '').toLowerCase()

    if (isGlyphNode(pascalTag, parentTag)) {
      const entry = createGlyphEntry(pascalTag, lineIndex, lines, xml, adapters)
      if (entry) results.push(entry)
    }

    const { isSelfClosing } = analyzeTagStructure(lines, lineIndex)
    if (!isSelfClosing) {
      tagStack.push(baseTagName)
    }
  }

  return results
}
