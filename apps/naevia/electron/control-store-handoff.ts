import { join } from "node:path"

export async function openControlStore(
  localAppData: string | undefined,
  openPath: (path: string) => Promise<string>,
) {
  if (!localAppData) throw new Error("Diretório local do Windows indisponível")
  const executable = join(localAppData, "Matriz Control", "matriz-control.exe")
  const error = await openPath(executable)
  if (error) throw new Error("Matriz Control não está instalado ou não pôde ser aberto")
  return { opened: true as const }
}
