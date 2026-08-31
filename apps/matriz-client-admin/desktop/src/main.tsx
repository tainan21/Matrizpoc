import React from "react"
import { createRoot } from "react-dom/client"
import { trustedWebOrigin } from "./connection"
import "./styles.css"

function DesktopLauncher() {
  const mode = import.meta.env.DEV ? "development" : "production"
  let origin: string | null = null
  try { origin = trustedWebOrigin(import.meta.env.VITE_CLIENT_ADMIN_WEB_ORIGIN || (mode === "development" ? "http://127.0.0.1:3013" : undefined), mode) } catch { origin = null }
  React.useEffect(() => { if (origin) window.location.replace(origin) }, [origin])
  return <main><span className="mark">M</span><h1>Client Admin</h1><p>{origin ? "Abrindo a experiência segura…" : "A origem web de produção não está configurada."}</p>{origin && <button onClick={() => window.location.replace(origin!)}>Tentar novamente</button>}</main>
}
createRoot(document.getElementById("root")!).render(<DesktopLauncher />)
