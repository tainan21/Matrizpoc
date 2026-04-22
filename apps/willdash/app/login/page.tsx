import type { Metadata } from "next"
import { WilldashLoginScreen } from "../../src/domains/login/presentation/LoginScreen"

export const metadata: Metadata = {
  title: "Willdash — Entrar",
  description: "Login do Willdash no ecossistema Matriz.",
}

export default function WilldashLoginPage() {
  return <WilldashLoginScreen />
}
