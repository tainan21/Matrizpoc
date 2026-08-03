"use client"

import { useEffect, useRef } from "react"
import { captureInboxItemAction } from "../../../app/actions"

export function QuickInboxCapture() {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function focusCapture(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (event.key.toLowerCase() !== "c" || event.metaKey || event.ctrlKey || event.altKey || target?.matches("input, textarea, select, [contenteditable='true']")) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener("keydown", focusCapture)
    return () => document.removeEventListener("keydown", focusCapture)
  }, [])
  return (
    <form action={captureInboxItemAction} className="quick-capture">
      <input name="origin" type="hidden" value="human" />
      <label className="sr-only" htmlFor="quick-inbox-title">Capturar uma entrada</label>
      <input id="quick-inbox-title" name="title" placeholder="Capture uma frase e refine depois…" ref={inputRef} required />
      <button className="button primary" type="submit">Capturar <kbd>C</kbd></button>
    </form>
  )
}
