import {
  Bike,
  BatteryCharging,
  CircleDot,
  Cog,
  Droplets,
  Paintbrush,
  Snowflake,
  Truck,
  Wrench,
} from 'lucide-react'

/** Soft tile backgrounds, cycled by index so neighbouring tiles never share a colour. */
const PASTELS = [
  'bg-[#E9F7EF]',
  'bg-[#FFF3E2]',
  'bg-[#EAF1FF]',
  'bg-[#F3EDFF]',
  'bg-[#FFEDEF]',
  'bg-[#E6F8F6]',
]

export function pastelAt(index) {
  return PASTELS[Math.abs(index) % PASTELS.length]
}

const BIKE_TONES = [
  { tone: 'bg-[#FFEFE0]', fg: 'text-orange-600' },
  { tone: 'bg-[#EAF1FF]', fg: 'text-blue-600' },
  { tone: 'bg-[#F3EDFF]', fg: 'text-violet-600' },
  { tone: 'bg-[#E6F8F6]', fg: 'text-teal-600' },
]

const RULES = [
  [/tow|roadside|recovery|jump|lockout|fuel|breakdown/i, { Icon: Truck, tone: 'bg-[#FFF1D6]', fg: 'text-amber-600' }],
  [/puncture|tyre|tire|wheel|alignment|balanc/i, { Icon: CircleDot, tone: 'bg-[#FFE9EC]', fg: 'text-rose-500' }],
  [/battery|electrical|alternator|starter|lights?|wiring/i, { Icon: BatteryCharging, tone: 'bg-[#F1E9FF]', fg: 'text-violet-600' }],
  [/wash|detail|clean|polish/i, { Icon: Droplets, tone: 'bg-[#E3F5FF]', fg: 'text-sky-600' }],
  [/dent|paint|body|scratch/i, { Icon: Paintbrush, tone: 'bg-[#FFE8F3]', fg: 'text-pink-600' }],
  [/\bac\b|air.?con|cooling|compressor/i, { Icon: Snowflake, tone: 'bg-[#E0F7FA]', fg: 'text-cyan-600' }],
  [/periodic|general service|oil|filter|service/i, { Icon: Cog, tone: 'bg-[#E9F7EF]', fg: 'text-emerald-600' }],
  [/repair|brake|clutch|engine|gear|transmission|suspension|mechanic/i, { Icon: Wrench, tone: 'bg-[#E8F0FF]', fg: 'text-blue-600' }],
]

/**
 * Icon + colours for a service/category tile, picked from its name so the home
 * screen looks right for whatever catalogue the admin has configured.
 * @returns {{ Icon: import('lucide-react').LucideIcon, tone: string, fg: string }}
 */
export function serviceVisual(name = '', index = 0) {
  const text = String(name)
  if (/\bbike|motorcycle|scooter|two.?wheeler/i.test(text)) {
    const t = BIKE_TONES[Math.abs(index) % BIKE_TONES.length]
    return { Icon: Bike, ...t }
  }
  for (const [re, v] of RULES) if (re.test(text)) return v
  return { Icon: Wrench, tone: pastelAt(index), fg: 'text-brand' }
}
