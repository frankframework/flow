import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/projectlanding/project-landing.tsx'),
  route('datamapper', 'routes/datamapper/index.tsx'),
  route('*', 'routes/app-layout.tsx'),
] satisfies RouteConfig
