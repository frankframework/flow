export const ACTION_TYPES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  EXCEPTION: 'exception',
  CUSTOM: 'custom',
} as const

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES]
