// Used to fix import error in TypeScript
declare module '*.mdx' {
  import { ComponentType } from 'react'
  const component: ComponentType
  export default component
}
