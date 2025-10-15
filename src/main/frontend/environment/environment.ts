import development from './development'
import production from './production'
import type { EnvironmentVariables } from './base'

const environment = process.env.NODE_ENV

const variables: EnvironmentVariables = environment === 'development' ? development : production

export default variables
