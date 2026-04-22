import type { Metadata } from "next"
import { SpotLoginScreen } from "../../src/domains/login/presentation/LoginScreen"

export const metadata: Metadata = {
  title: "Spot — Entrar",
  description: "Login do app Spot no ecossistema Matriz.",
}

export default function SpotLoginPage() {
  return <SpotLoginScreen />
}
