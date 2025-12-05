const isDevelopment = import.meta.env.DEV

export const API_BASE_URL = isDevelopment
  ? '/' // uses Vite proxy
  : 'https://api.wearefrank.com/' // Production API URL, change as needed
