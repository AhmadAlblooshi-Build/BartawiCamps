import type { ComponentProps } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

interface Props extends Omit<ComponentProps<PhosphorIcon>, 'weight'> {
  icon: PhosphorIcon
  emphasis?: boolean
}

export function Icon({ icon: IconComponent, emphasis = false, size = 18, ...props }: Props) {
  return <IconComponent weight={emphasis ? 'regular' : 'light'} size={size} {...props} />
}
