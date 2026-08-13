import type { CSSProperties } from "react"
import type { HubIconName } from "./types"

const ICON_PATHS = {
  overview: ["M4 4h6v6H4z", "M14 4h6v10h-6z", "M4 14h6v6H4z", "M14 18h6v2h-6z"],
  project: ["M4 7h16v12H4z", "M8 7V4h8v3", "M4 11h16"],
  health: ["M3 12h4l2-5 4 10 2-5h6"],
  architecture: ["M12 3 4 7v10l8 4 8-4V7z", "M4 7l8 4 8-4", "M12 11v10"],
  registry: ["M5 4h14v5H5z", "M5 15h14v5H5z", "M8 9v6", "M16 9v6"],
  ecosystem: ["M12 4v5", "M6 20v-5", "M18 20v-5", "M6 15h12", "M12 9 6 12", "M12 9l6 3"],
  link: ["M9 15 15 9", "M7 17H5a4 4 0 0 1 0-8h4", "M15 7h4a4 4 0 0 1 0 8h-4"],
  event: ["M5 5h14v14H5z", "M8 2v6", "M16 2v6", "M5 10h14", "M9 14h6"],
  telemetry: ["M3 17h3l2-8 4 11 3-14 3 11h3"],
  onboarding: ["M5 12h14", "M12 5l7 7-7 7", "M5 5v14"],
  flag: ["M5 21V4", "M5 5h11l-2 4 2 4H5"],
  docs: ["M6 3h9l3 3v15H6z", "M15 3v4h4", "M9 12h6", "M9 16h6"],
  review: ["M5 4h14v16H5z", "M8 9h8", "M8 13h5", "M15 16l2 2 4-5"],
  context: ["M4 5h16v14H4z", "M8 9h8", "M8 13h5"],
  graph: ["M5 5h4v4H5z", "M15 5h4v4h-4z", "M10 15h4v4h-4z", "M9 7h6", "M7 9l5 6", "M17 9l-5 6"],
  timeline: ["M6 4v16", "M6 7h12", "M6 12h8", "M6 17h10"],
  tool: ["M14 5a4 4 0 0 0 5 5l-9 9-5-5 9-9z", "M5 14l-2 2 5 5 2-2"],
  roadmap: ["M5 20V4", "M5 6h10l-2 4 2 4H5", "M5 17h7"],
  agent: ["M7 8a5 5 0 0 1 10 0", "M5 10h14v9H5z", "M9 14h.01", "M15 14h.01"],
  release: ["M12 3v12", "M7 10l5 5 5-5", "M5 19h14"],
  audit: ["M6 3h12v18H6z", "M9 8h6", "M9 12h6", "M9 16h3"],
  search: ["M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z", "m15 15 5 5"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  close: ["M5 5l14 14", "M19 5 5 19"],
  chevron: ["m9 5 7 7-7 7"],
  activity: ["M12 4v16", "M4 12h16", "m7 7 10 10", "m17 7-10 10"],
  user: ["M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M5 21a7 7 0 0 1 14 0"],
  logout: ["M10 4H5v16h5", "M14 8l4 4-4 4", "M8 12h10"],
  command: ["M9 6V4a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v16a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"],
  warning: ["M12 3 2 20h20z", "M12 9v5", "M12 18h.01"],
  check: ["m5 12 4 4L19 6"],
  database: ["M5 6c0-2 14-2 14 0v12c0 2-14 2-14 0z", "M5 6c0 2 14 2 14 0", "M5 12c0 2 14 2 14 0"],
  layers: ["m12 3 9 5-9 5-9-5z", "m3 12 9 5 9-5", "m3 16 9 5 9-5"],
} satisfies Record<HubIconName, readonly string[]>

export interface HubIconProps {
  readonly name: HubIconName
  readonly size?: 16 | 18 | 20 | 24 | 28 | 32
  readonly label?: string
  readonly className?: string
  readonly style?: CSSProperties
}

export function HubIcon({
  name,
  size = 20,
  label,
  className,
  style,
}: HubIconProps) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      fill="none"
      height={size}
      role={label ? "img" : undefined}
      style={style}
      viewBox="0 0 24 24"
      width={size}
    >
      {ICON_PATHS[name].map((path) => (
        <path
          d={path}
          key={path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      ))}
    </svg>
  )
}
