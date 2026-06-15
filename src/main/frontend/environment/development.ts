import base, { type EnvironmentVariables } from './base'

const development: EnvironmentVariables = {
  ...base,
  apiBaseUrl: '',
}

export default development
