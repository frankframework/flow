import 'react'

declare module 'react' {
  /*
   * https://github.com/facebook/react/issues/3468
   * Must stay an `interface` for module augmentation (declaration merging) to work.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/consistent-type-definitions
  interface InputHTMLAttributes<T> {
    webkitdirectory?: 'true' | 'false'
  }
}
