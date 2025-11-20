import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/projects/projects.tsx'),
  route('studio', 'routes/studio/studio.tsx'),
  route('editor', 'routes/editor/editor.tsx'),
  route('help/:topic?', 'routes/help/help.tsx'),
  route('settings', 'routes/settings/settings.tsx'),
] satisfies RouteConfig
