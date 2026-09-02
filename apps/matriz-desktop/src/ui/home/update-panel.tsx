import { useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { UpdateInfo } from "../../domain/types"

export function UpdatePanel({
  gateway,
  confirmInstall = (message) => window.confirm(message),
}: {
  readonly gateway: DesktopGateway
  readonly confirmInstall?: (message: string) => boolean
}) {
  const [info, setInfo] = useState<UpdateInfo>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState(0)

  const check = async () => {
    setBusy(true)
    setError(false)
    try {
      setInfo(await gateway.checkUpdate())
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  const download = async () => {
    setBusy(true)
    setError(false)
    try {
      setInfo(await gateway.downloadUpdate(({ downloadedBytes, totalBytes }) => {
        if (totalBytes) setProgress(Math.min(100, Math.round(downloadedBytes / totalBytes * 100)))
      }))
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  const install = async () => {
    if (!info?.version || !confirmInstall(`Instalar Matriz Control ${info.version} e reiniciar agora?`)) return
    setBusy(true)
    setError(false)
    try {
      await gateway.installUpdate()
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  return <section className="home-update" aria-label="Atualizações do Control">
    <div><span className="eyebrow">ATUALIZAÇÕES</span><strong>{info?.state === "available" || info?.state === "downloaded" ? `${info.version} disponível` : info?.state === "current" ? "Control atualizado" : "Atualização manual"}</strong></div>
    {info?.notes ? <p>{info.notes}</p> : null}
    {busy && progress ? <small>{progress}% baixado</small> : null}
    {error ? <p role="status">Não foi possível verificar atualizações.</p> : null}
    {!info || info.state === "current" || info.state === "unavailable" ? <button aria-label="Verificar atualizações" disabled={busy} onClick={() => void check()}>VERIFICAR ATUALIZAÇÕES</button> : null}
    {info?.state === "available" ? <button aria-label="Baixar atualização" disabled={busy} onClick={() => void download()}>BAIXAR ATUALIZAÇÃO</button> : null}
    {info?.state === "downloaded" ? <button aria-label="Instalar e reiniciar" disabled={busy} onClick={() => void install()}>INSTALAR E REINICIAR</button> : null}
  </section>
}
