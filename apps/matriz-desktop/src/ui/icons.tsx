import type { SVGProps } from "react"

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const Icons = {
  ports: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="M5 7h14M7 12h10M9 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="5" cy="7" r="1.5" fill="currentColor"/><circle cx="19" cy="7" r="1.5" fill="currentColor"/></Icon>
  ),
  apps: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7"/></Icon>
  ),
  workspace: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="M3.5 7.5h6l2-2h9v13h-17v-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M4 9.5h16" stroke="currentColor" strokeWidth="1.5"/></Icon>
  ),
  hub: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><path d="M15 14h5v6h-6v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></Icon>
  ),
  store: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="M5 9h14l-1 11H6L5 9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></Icon>
  ),
  terminal: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="m5 7 4 4-4 4m7 1h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/></Icon>
  ),
  actions: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="M13 2 5 14h6l-1 8 9-13h-6V2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></Icon>
  ),
  doctor: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="M4 13h4l2-5 4 9 2-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></Icon>
  ),
  settings: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></Icon>
  ),
  refresh: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="M19 7v5h-5M5 17v-5h5M7 8a6 6 0 0 1 10-1l2 2M5 15l2 2a6 6 0 0 0 10-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></Icon>
  ),
  close: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></Icon>
  ),
  kill: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="M8 8l8 8m0-8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/></Icon>
  ),
  play: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="m9 7 8 5-8 5V7Z" fill="currentColor"/></Icon>
  ),
  stop: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/></Icon>
  ),
  external: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}><path d="M10 6H6v12h12v-4M13 5h6v6m0-6-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></Icon>
  ),
}
