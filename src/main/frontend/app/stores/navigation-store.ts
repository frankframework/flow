import { create } from 'zustand'

export type AppRoute = 'configurations' | 'studio' | 'editor' | 'help' | 'settings'

interface NavigationState {
  currentRoute: AppRoute
  routeParams: Record<string, string>
  navigate: (route: AppRoute, params?: Record<string, string>) => void
  getParam: (key: string) => string | undefined
}

function parseCurrentUrl(): { route: AppRoute; params: Record<string, string> } {
  if (globalThis.window === undefined) {
    return { route: 'configurations', params: {} }
  }

  const path = globalThis.location.pathname
  const params: Record<string, string> = {}

  if (path.startsWith('/help')) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length > 1) {
      params.topic = parts[1]
    }
    return { route: 'help', params }
  }

  if (path.startsWith('/studio')) return { route: 'studio', params }
  if (path.startsWith('/editor')) return { route: 'editor', params }
  if (path.startsWith('/settings')) return { route: 'settings', params }
  if (path.startsWith('/configurations')) return { route: 'configurations', params }

  return { route: 'configurations', params }
}

const initial = parseCurrentUrl()

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentRoute: initial.route,
  routeParams: initial.params,

  navigate: (route: AppRoute, params?: Record<string, string>) => {
    let newPath = `/${route}`
    if (params?.topic && route === 'help') {
      newPath = `/help/${params.topic}`
    }

    if (globalThis.location.pathname !== newPath) {
      globalThis.history.pushState({}, '', newPath)
    }

    set({ currentRoute: route, routeParams: params ?? {} })
  },

  getParam: (key: string) => {
    return get().routeParams[key]
  },
}))

if (globalThis.window !== undefined) {
  globalThis.addEventListener('popstate', () => {
    const { route, params } = parseCurrentUrl()
    useNavigationStore.setState({ currentRoute: route, routeParams: params })
  })
}
