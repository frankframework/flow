import base, { type EnvironmentVariables } from './base'

const development: EnvironmentVariables = {
  ...base,
  frankDocJsonUrl: '/js/frankdoc.json',
  apiBaseUrl: 'http://localhost:8080',
}

export default development
