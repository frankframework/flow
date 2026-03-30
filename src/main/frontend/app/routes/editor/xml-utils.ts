import { showErrorToast } from '~/components/toast'
import { normalizeXml } from '~/services/xml-service'
import { ApiError } from '~/utils/api'

interface AdapterLocation {
  name: string
  offset: number
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

export function findAdapterAtOffset(adapters: AdapterLocation[], cursorOffset: number): string {
  for (let i = adapters.length - 1; i >= 0; i--) {
    if (adapters[i].offset <= cursorOffset) return adapters[i].name
  }
  return adapters[0].name
}

export function findAdapterIndexAtOffset(adapters: AdapterLocation[], cursorOffset: number): number {
  for (let i = adapters.length - 1; i >= 0; i--) {
    if (adapters[i].offset <= cursorOffset) return i
  }
  return 0
}

/**  Converts the tagname of a non capitalized element that has a classname attribute to the last part of said classname, e.g.:
 * <pipe name="uploadFiles" className="org.frankframework.pipes.ForEachChildElementPipe" />
 * Becomes <ForEachChildElementPipe name="uploadFiles" />
 *
 * Also updates all other elements to be capitalized, e.g.:
 * <param /> becomes <Param />
 */
export async function normalizeFrankElements(xml: string): Promise<string> {
  try {
    const response = await normalizeXml(xml)

    if (response?.xmlContent) {
      return response.xmlContent
    }

    showErrorToast('Normalization failed: Invalid server response.')
    return xml
  } catch (error) {
    console.error('Normalization error:', error)

    if (error instanceof ApiError) {
      showErrorToast(error.messages?.join(', ') ?? 'Normalization failed.')
    }

    return xml
  }
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
