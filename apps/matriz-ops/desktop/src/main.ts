import "./styles.css"
import { invoke } from "@tauri-apps/api/core"
import { connectToOps } from "./connection"

const status = document.querySelector<HTMLParagraphElement>("#status")
const retry = document.querySelector<HTMLButtonElement>("#retry")

async function connect() {
  if (!status || !retry) return
  retry.hidden = true
  retry.disabled = true
  status.textContent = "Conectando ao centro de controle…"
  const state = await connectToOps(() => invoke<void>("connect_ops"))
  if (state === "unavailable") {
    status.textContent = "Serviço indisponível. Verifique a conexão e tente novamente."
    retry.hidden = false
    retry.disabled = false
  }
}

retry?.addEventListener("click", () => void connect())
void connect()
