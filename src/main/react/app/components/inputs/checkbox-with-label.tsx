import Checkbox, { type CheckboxProperties } from '~/components/inputs/checkbox'
import InputWithLabel from '~/components/inputs/input-with-label'
import { useId } from 'react'

type CheckboxWithLabelProperties = {
  id?: string
  label: string
  description?: string
} & CheckboxProperties

export default function CheckboxWithLabel({ id, label, description, ...properties }: CheckboxWithLabelProperties) {
  const uniqueId = id ?? useId()

  return (
    <InputWithLabel id={uniqueId} label={label} description={description}>
      <Checkbox id={uniqueId} {...properties} />
    </InputWithLabel>
  )
}
