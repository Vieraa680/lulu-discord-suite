'use client'

import { Icon as IconifyIcon } from '@iconify/react'
import type { ComponentProps } from 'react'

type IconifyProps = ComponentProps<typeof IconifyIcon>

/**
 * @example
 *   <Icon name="TROPHY" className="w-5 h-5 text-yellow-500" />
 *   <Icon icon="mdi:sword-cross" className="w-6 h-6" />
 */
interface IconProps extends Omit<IconifyProps, 'icon'> {
  /** Semantic icon key from ICON_DEFS (e.g. "SWORDS", "TROPHY", "CANDY") */
  name?: string
  /** Direct Iconify icon ID (e.g. "mdi:sword-cross"). Overrides `name` if set. */
  icon?: string
}

export function Icon({ name, icon, ...props }: IconProps) {
  // If `icon` is provided directly, use it; otherwise resolve from `name`
  const resolvedIcon = icon ?? resolveIconifyId(name)

  if (!resolvedIcon) {
    console.warn(`[Icon] No Iconify ID resolved for name="${name}"`)
    return null
  }

  return <IconifyIcon icon={resolvedIcon} {...props} />
}

/**
 * Quick lookup: map semantic name → Iconify ID.
 * Duplicated inline to avoid coupling with lib/icons — the component
 * should stay self-contained. For advanced usage, import ICON_DEFS directly.
 */
const ICONIFY_MAP: Record<string, string> = {
  SWORDS:    'mdi:sword-cross',
  SWORD:     'mdi:sword',
  SHIELD:    'mdi:shield',
  TROPHY:    'mdi:trophy',
  SKULL:     'mdi:skull-outline',
  DICE:      'mdi:dice-d20',
  CHECK:     'mdi:check-circle',
  CROSS:     'mdi:close-circle',
  LOCK:      'mdi:lock',
  ALARM:     'mdi:alarm',
  HOURGLASS: 'mdi:hourglass',
  STOPWATCH: 'mdi:stopwatch',
  CANDY:     'mdi:candy',
  MONEY:     'mdi:cash',
  PACKAGE:   'mdi:package-variant',
  SPARKLES:  'mdi:sparkles',
  LIGHTNING: 'mdi:lightning-bolt',
  TORNADO:   'mdi:weather-tornado',
  CHART:     'mdi:chart-bar',
  MEDAL:     'mdi:medal',
}

function resolveIconifyId(name?: string): string | undefined {
  if (!name) return undefined
  return ICONIFY_MAP[name.toUpperCase()]
}
