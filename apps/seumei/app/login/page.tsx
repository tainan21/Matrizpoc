import type { Metadata } from "next"
import { SeumeiLoginScreen } from "../../src/domains/login/presentation/LoginScreen"

export const metadata: Metadata = {
  title: "Seumei — Entrar",
  description: "Login do app Seumei no ecossistema Matriz.",
}

export default function SeumeiLoginPage() {
  return <SeumeiLoginScreen />
}
