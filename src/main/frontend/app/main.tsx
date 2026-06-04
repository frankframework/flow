import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toast } from '~/components/toast'
import { useTheme } from '~/hooks/use-theme'
import { useProjectStore } from '~/stores/project-store'
import { router } from './router'
import './app.css'
import 'allotment/dist/style.css'

function TitleSync() {
  const project = useProjectStore((state) => state.project)

  useEffect(() => {
    document.title = project ? `FF! Flow | ${project.name}` : 'FF! Flow'
  }, [project])

  return null
}

function ThemeSync() {
  const theme = useTheme()

  useEffect(() => {
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
