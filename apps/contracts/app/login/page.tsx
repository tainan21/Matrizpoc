import type { Metadata } from "next"
import { ContractsLoginScreen } from "../../src/domains/login/presentation/LoginScreen"

export const metadata: Metadata = {
  title: "Contratos — Entrar",
  description: "Login do app Contratos no ecossistema Matriz.",
}

export default function ContractsLoginPage() {
  return <ContractsLoginScreen />
}
