import Button from '~/components/inputs/button'
import { showErrorToast, showInfoToast } from '~/components/toast'
import { generateDatamapperXSLT } from '~/services/datamapper-service'
import { useProjectStore } from '~/stores/project-store'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import { convertMappingConfigToMappingFile } from '~/utils/datamapper_utils/conversion-utils'

export default function GenerateButton({
  highlightUnset,
  mappingListConfig,
}: {
  highlightUnset: () => void
  mappingListConfig: MappingListConfig
}) {
  const project = useProjectStore.getState().project

  return (
    <Button
      className="bg-foreground-active disabled:bg-backdrop disabled:text-foreground-muted font-medium text-[var(--color-neutral-900)] transition hover:brightness-110"
      onClick={async () => {
        highlightUnset()
        if (!project) {
          showErrorToast('Not in valid project!')
          return
        }

        try {
          await generateDatamapperXSLT(
            project.name,
            JSON.stringify(convertMappingConfigToMappingFile(mappingListConfig)),
          )

          showInfoToast(
            'Any items marked with red do not have any connected mappings and no defaultValue. Any items marked yellow have no mapping but do have a defaultValue',
            'Generating XSLT!',
          )
        } catch (error) {
          showErrorToast(error instanceof Error ? error.message : String(error))
        }
      }}
    >
      Export as final mappingFile
    </Button>
  )
}
