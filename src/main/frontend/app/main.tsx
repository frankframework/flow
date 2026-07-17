import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toast } from '~/components/toast'
import { useTheme } from '~/hooks/use-theme'
import { useProjectStore } from '~/stores/project-store'
import { router } from './router'
import 'allotment/dist/style.css'
import './app.css' // Always last for overwriting variables

function TitleSync(): null {
  const project = useProjectStore((state): ConfigurationProject | undefined => state.project)

  useEffect((): void => {
    document.title = project ? `FF! Flow | ${project.name}` : 'FF! Flow'
  }, [project])

  return null
}

function ThemeSync(): null {
  const theme = useTheme()

  useEffect((): void => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return null
}

ReactDOM.createRoot(document.querySelector('#root')!).render(
  <React.StrictMode>
    <TitleSync />
    <ThemeSync />
    <RouterProvider router={router} />
    <Toast />
  </React.StrictMode>,
)
