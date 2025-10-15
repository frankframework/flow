import base, { type EnvironmentVariables } from './base'

const development: EnvironmentVariables = {
  ...base,
  frankDocJsonUrl: 'http://localhost:3000/js/frankdoc.json',
}

export default development
