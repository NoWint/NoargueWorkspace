import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...props}
    >
      {children}
    </svg>
  )
}

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="3" width="12" height="11" rx="1" />
    <path d="M2 6h12M5 1v3M11 1v3" />
  </Icon>
)

export const CalendarCheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="3" width="12" height="11" rx="1" />
    <path d="M2 6h12M6 9l2 2 3-4" />
  </Icon>
)

export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 4l5-2 5 2 2-1v9l-5 2-5-2-2 1V4z" />
  </Icon>
)

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 14V8M6 14V4M10 14v-7M14 14V2" />
  </Icon>
)

export const StarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2l2 5h5l-4 3 1.5 5L8 12l-4.5 3L5 10 1 7h5z" />
  </Icon>
)

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3 3" />
  </Icon>
)

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2a4 4 0 0 0-4 4v3l-1 2h10l-1-2V6a4 4 0 0 0-4-4zM6 13a2 2 0 0 0 4 0" />
  </Icon>
)

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 9a5 5 0 0 1-6-6 5 5 0 1 0 6 6z" />
  </Icon>
)

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" />
  </Icon>
)

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3v10M3 8h10" />
  </Icon>
)

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8l3 3 6-7" />
  </Icon>
)

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4v4l3 2" />
  </Icon>
)

export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 8l6-6h6v6l-6 6-6-6z" />
    <circle cx="11" cy="5" r="1" />
  </Icon>
)

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 5h10M5 5V3h6v2M4 5l1 9h6l1-9" />
  </Icon>
)

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6l4 4 4-4" />
  </Icon>
)

export const MicIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8a5 5 0 0 1 10 0M13 8a5 5 0 0 1-10 0M8 3v10" />
  </Icon>
)

export const BatchIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 4h10M5 4V2h6v2M4 4l1 10h6l1-10" />
  </Icon>
)
