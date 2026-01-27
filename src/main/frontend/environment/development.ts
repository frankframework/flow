import base, { type EnvironmentVariables } from './base'

const development: EnvironmentVariables = {
  ...base,
  frankDocJsonUrl: 'https://frankdoc.frankframework.org/js/frankdoc.json',
  apiBaseUrl: 'http://localhost:8080',
}

export default development
