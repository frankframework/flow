import type { Condition, Mutation } from '~/types/datamapper_types/function-types'

export function generateMutationName(mutation: Mutation) {
  console.dir(mutation)
  const inputs = mutation.inputs
    .map((i) => {
      return i ? i.value : ''
    })
    .join(', ')

  return `${mutation.mutationType?.name}(${inputs})`
}
export function generateConditionName(condition: Condition) {
  const inputs = condition.inputs
    .map((i) => {
      return i ? i.value : ''
    })
    .join(', ')

  return `${condition.type?.name}(${inputs})`
}
