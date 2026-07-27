import type { Condition, Mutation } from '~/types/datamapper_types/function-types'

export function generateMutationName(mutation: Mutation): string {
  const inputs = mutation.inputs
    .map((index): string => {
      return index ? index.value : ''
    })
    .join(', ')

  return `${mutation.mutationType?.name}(${inputs})`
}
export function generateConditionName(condition: Condition): string {
  const inputs = condition.inputs
    .map((index): string => {
      return index ? index.value : ''
    })
    .join(', ')

  return `${condition.type?.name}(${inputs})`
}
