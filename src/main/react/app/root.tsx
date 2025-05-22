import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'

import type { Route } from './+types/root'
import Navbar from '~/components/navbar/navbar'
import 'allotment/dist/style.css'
import './app.css'
import React, { useEffect } from 'react'
import useFrankDocStore from '~/stores/frank-doc-store'
import { useTheme } from '~/hooks/use-theme'

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  {
    rel: 'icon',
    href: '/favicons/favicon-96x96.png',
    sizes: '96x96',
    type: 'image/png',
  },
  { rel: 'icon', href: '/favicons/favicon.svg', type: 'image/svg+xml' },
  { rel: 'shortcut icon', href: '/favicons/favicon.ico' },
  {
    rel: 'apple-touch-icon',
    href: '/favicons/apple-touch-icon.png',
    sizes: '180x180',
  },
  { rel: 'manifest', href: '/favicons/site.webmanifest' },
]

export function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = useTheme()

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta content="FF! Flow" name="apple-mobile-web-app-title" />
        <Meta />
        <Links />
      </head>
      <body className="flex">
        <Navbar />
        <main className="grow">{children}</main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const { fetchFile } = useFrankDocStore()
  useEffect(() => {
    fetchFile()
  }, [])
  return <Outlet />
}

export function ErrorBoundary({ error }: Readonly<Route.ErrorBoundaryProps>) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
