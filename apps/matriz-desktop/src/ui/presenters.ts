import { MATRIZ_DESKTOP_APPS } from "../application/catalog"
import type { PortProcess } from "../domain/types"

const appOrder = new Map(MATRIZ_DESKTOP_APPS.map((app, index) => [app.port, index]))

export function presentPorts(ports: readonly PortProcess[]): readonly PortProcess[] {
  return [...ports].sort((left, right) => {
    const leftOrder = appOrder.get(left.port) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = appOrder.get(right.port) ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder || left.port - right.port || left.pid - right.pid
  })
}

export function filterPorts(
  ports: readonly PortProcess[],
  rawQuery: string,
): readonly PortProcess[] {
  const query = rawQuery.trim().toLocaleLowerCase("pt-BR")
  if (!query) return ports
  return ports.filter((process) =>
    [process.port, process.pid, process.processName].some((value) =>
      String(value).toLocaleLowerCase("pt-BR").includes(query),
    ),
  )
}
