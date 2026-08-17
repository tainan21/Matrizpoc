import type { Metadata } from "next"
import { HubLoginScreen } from "../../src/domains/login/presentation/LoginScreen"

export const metadata: Metadata = {
  title: "MyHub — Entrar",
  description: "Login do MyHub.",
}

export default function HubLoginPage() {
  return <HubLoginScreen />
}
