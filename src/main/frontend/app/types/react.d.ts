import 'react'

declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: 'true' | 'false'
  }
}
