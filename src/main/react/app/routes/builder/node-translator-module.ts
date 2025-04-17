const typeSuffixes = ['pipe', 'listener', 'receiver', 'sender', 'validator', 'wrapper', 'job', 'exit']

const typeColorMap: Record<string, string> = {
  pipe: '#68D250',
  listener: '#D250BF',
  receiver: '#D250BF',
  sender: '#30CCAF',
  validator: '#3079CC',
  wrapper: '#4A30CC',
  job: '#E0DE54',
  exit: '#E84E4E',
}

export function getElementTypeFromName(name: string): string {
  const lower = name.toLowerCase()
  const match = typeSuffixes.find((suffix) => lower.endsWith(suffix)) // Example: Translates 'ExceptionPipe' --> 'pipe'
  return match ?? 'default'
}

export function getColorFromType(type: string): string {
  return typeColorMap[type.toLowerCase()] ?? '#FDC300' // #FDC300 is the default color for elements without a type in the typeColorMap above
}
