import base, { type EnvironmentVariables } from './base'

const development: EnvironmentVariables = {
  ...base,
  apiBaseUrl: 'http://localhost:8080',
}

export default development
