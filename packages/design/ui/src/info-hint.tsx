"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"

import { cn } from "@matriz/foundation-utils"

export interface InfoHintProps {
  children: ReactNode
  label?: string
  className?: string
}

export function InfoHint({
  children,
  label = "More information",
  className,
}: InfoHintProps) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <span
      ref={rootRef}
      className={cn("matriz-info-hint", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="matriz-info-hint__trigger"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open ? (
        <span id={tooltipId} role="tooltip" className="matriz-info-hint__content">
          {children}
        </span>
      ) : null}
    </span>
  )
}
