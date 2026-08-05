"use client"

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react"
import styles from "./info-hint.module.css"

export function InfoHint({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)

  function closeAfterBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }

  function closeAfterHover() {
    if (!rootRef.current?.contains(document.activeElement)) setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Escape") return
    setOpen(false)
    event.stopPropagation()
  }

  return (
    <span
      className={styles.root}
      onBlur={closeAfterBlur}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={closeAfterHover}
      ref={rootRef}
    >
      <button
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        aria-label={label}
        className={styles.trigger}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <span aria-hidden="true">i</span>
      </button>
      {open ? <span className={styles.tooltip} id={tooltipId} role="tooltip">{children}</span> : null}
    </span>
  )
}
