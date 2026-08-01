"use client"

import { useRef, useState } from "react"

export function CopyPromptButton({ prompt }: { prompt: string }) {
  const [message, setMessage] = useState("")
  const dismissTimer = useRef<number | null>(null)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setMessage("Prompt copiado. A próxima rodada já pode começar.")
    } catch {
      setMessage("Não foi possível copiar. Selecione o texto manualmente.")
    }
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current)
    dismissTimer.current = window.setTimeout(() => setMessage(""), 3200)
  }

  return (
    <>
      <button className="button primary" onClick={copyPrompt} type="button">
        Copiar próximo prompt
      </button>
      {message ? (
        <div aria-live="polite" className="toast" role="status">
          <span aria-hidden="true">✓</span>
          {message}
        </div>
      ) : null}
    </>
  )
}
