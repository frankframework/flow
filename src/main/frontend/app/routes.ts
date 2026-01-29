import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/projectlanding/project-landing.tsx'),
  route('*', 'routes/app-layout.tsx'),
] satisfies RouteConfig
