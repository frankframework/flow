import 'react'

declare module 'react' {
  // https://github.com/facebook/react/issues/3468
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface InputHTMLAttributes<T> {
    webkitdirectory?: 'true' | 'false'
  }
}
