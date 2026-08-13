"use client"

import * as React from "react"
import { StatusMark } from "./status"

export function OperationalDock() {
  const [now, setNow] = React.useState<Date | null>(null)

  React.useEffect(() => {
    const update = () => setNow(new Date())
    update()
    const timer = window.setInterval(update, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <footer className="hub-operational-dock" aria-label="Estado das fontes do ambiente">
      <span className="hub-operational-dock__item">
        <StatusMark status="running" label="Sistema operacional" />
        Sistema alpha
      </span>
      <span className="hub-operational-dock__item">
        <StatusMark status="available" label="Registry disponível no processo" />
        Registry · processo
      </span>
      <span className="hub-operational-dock__item">
        <StatusMark status="available" label="Dados institucionais em snapshot" />
        Institucional · snapshot
      </span>
      <span className="hub-operational-dock__item">
        <StatusMark status="temporary" label="Atividade mantida por sessão" />
        Atividade · sessão
      </span>
      <time className="hub-operational-dock__item" dateTime={now?.toISOString()} suppressHydrationWarning>
        {now?.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }) ?? "—"}
      </time>
    </footer>
  )
}
