import { useId } from "react"
import { HubIcon } from "./icons"

export function InfoHint({ label, children }: { readonly label: string; readonly children: string }) {
  const id = useId()
  return (
    <span className="hub-info-hint">
      <button aria-describedby={id} aria-label={`Informação: ${label}`} type="button">
        <HubIcon name="info" size={16} />
      </button>
      <span className="hub-info-hint__popover" id={id} role="tooltip">
        <strong>{label}</strong>
        <span>{children}</span>
      </span>
    </span>
  )
}
