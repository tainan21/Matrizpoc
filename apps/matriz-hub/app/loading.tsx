import { SurfaceState } from "../src/ui/environment/SurfaceState"

export default function Loading() {
  return (
    <SurfaceState
      description="As fontes do Hub estão sendo consultadas e organizadas para esta área."
      kind="loading"
      title="Atualizando o ambiente"
    />
  )
}
