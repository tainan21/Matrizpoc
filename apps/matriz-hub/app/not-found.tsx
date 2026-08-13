import { SurfaceState } from "../src/ui/environment/SurfaceState"

export default function NotFound() {
  return (
    <SurfaceState
      action={{ href: "/", label: "Voltar à visão geral" }}
      description="Esta rota não faz parte do ambiente atual ou foi realocada. Use a busca global para encontrar a função pelo significado."
      kind="empty"
      title="Área não encontrada"
    />
  )
}
