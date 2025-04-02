import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/projects.tsx'),
  route('builder', 'routes/builder.tsx'),
  route('editor', 'routes/editor.tsx'),
  route('help', 'routes/help.tsx'),
  route('settings', 'routes/settings.tsx'),
] satisfies RouteConfig
