export function parseWindowsCommandLine(command: string): { executable: string; args: string[] } {
  const input = command.trim()
  if (!input) throw new Error("Comando de desinstalação vazio")
  if (/[&|<>`\r\n]/.test(input)) throw new Error("Comando contém operador de shell não permitido")

  const tokens: string[] = []
  let token = ""
  let quoted = false
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (character === '"') {
      quoted = !quoted
      continue
    }
    if (/\s/.test(character) && !quoted) {
      if (token) {
        tokens.push(token)
        token = ""
      }
      continue
    }
    token += character
  }
  if (quoted) throw new Error("Comando contém aspas não balanceadas")
  if (token) tokens.push(token)
  const [executable, ...args] = tokens
  if (!executable) throw new Error("Executável ausente")
  return { executable, args }
}
