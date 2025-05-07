const typeSuffixes = ['pipe', 'listener', 'receiver', 'sender', 'validator', 'wrapper', 'job', 'exit']

export function getElementTypeFromName(name: string): string {
  const lower = name.toLowerCase()
  const match = typeSuffixes.find((suffix) => lower.endsWith(suffix)) // Example: Translates 'ExceptionPipe' --> 'pipe'
  return match ?? 'other'
}
