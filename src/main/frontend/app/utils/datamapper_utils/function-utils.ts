import type { Condition, Mutation } from '~/types/datamapper_types/function-types'

export function generateMutationName(mutation: Mutation) {
  const inputs = mutation.inputs
    .map((index) => {
      return index ? index.value : ''
    })
    .join(', ')

  return `${mutation.mutationType?.name}(${inputs})`
}
export function generateConditionName(condition: Condition) {
  const inputs = condition.inputs
    .map((index) => {
      return index ? index.value : ''
    })
    .join(', ')

  return `${condition.type?.name}(${inputs})`
}
