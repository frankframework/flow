import { getBaseName } from '~/utils/path-utils'

const ROOT_CONFIGURATION_FILENAME = 'configuration.xml'

export function isRootConfiguration(relativePath: string): boolean {
  return getBaseName(relativePath).toLowerCase() === ROOT_CONFIGURATION_FILENAME
}
