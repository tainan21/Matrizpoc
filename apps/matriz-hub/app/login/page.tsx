import type { Metadata } from "next"
import { HubLoginScreen } from "../../src/domains/login/presentation/LoginScreen"

export const metadata: Metadata = {
  title: "Matriz Hub — Entrar",
  description: "Login do Matriz Hub.",
}

export default function HubLoginPage() {
  return <HubLoginScreen />
}
