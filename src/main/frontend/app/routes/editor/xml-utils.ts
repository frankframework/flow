interface AdapterLocation {
  name: string
  offset: number
}

export function findAdaptersInXml(xml: string): AdapterLocation[] {
  const adapters: AdapterLocation[] = []
  const regex = /<Adapter\b[^>]*\bname\s*=\s*"([^"]*)"/g
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
