import { apiFetch } from '~/utils/api'

export async function saveAdapter(
  projectName: string,
  adapterXml: string,
  adapterName: string,
  configPath: string,
): Promise<void> {
  await apiFetch<void>(`/projects/${encodeURIComponent(projectName)}/adapters`, {
    method: 'PUT',
    body: JSON.stringify({
      adapterXml,
      adapterName,
      configurationPath: configPath,
    }),
  })
}
