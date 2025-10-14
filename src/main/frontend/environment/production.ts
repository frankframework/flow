import base, { type EnvironmentVariables } from './base'

const production: EnvironmentVariables = {
  ...base,
  frankDocJsonUrl: 'https://frankdoc.frankframework.org/js/frankdoc.json',
}

export default production
