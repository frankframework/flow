/**
 * Shared FF Doc type definitions
 * Extracted from @frankframework/ff-doc using TypeScript utility types
 */

import { useFFDoc } from '@frankframework/ff-doc/react'

type FFDocReturn = ReturnType<typeof useFFDoc>
export type Elements = NonNullable<FFDocReturn['elements']>
export type ElementDetails = Elements[string]
export type Attribute = NonNullable<ElementDetails['attributes']>[string]
type ElementEnums = NonNullable<ElementDetails['enums']>
export type EnumValues = ElementEnums[string]
export type EnumValue = EnumValues extends Record<string, infer V> ? V : never
