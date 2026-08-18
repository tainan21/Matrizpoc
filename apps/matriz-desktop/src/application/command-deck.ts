export interface DeckCommand {
  readonly id: string
  readonly label: string
  readonly keywords: readonly string[]
  readonly group: "Apps" | "Terminal" | "Portas" | "Gates" | "Ações"
  readonly status?: string
  readonly destructive?: boolean
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()

export function rankCommands(
  query: string,
  commands: readonly DeckCommand[],
  recentIds: readonly string[],
): readonly DeckCommand[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return commands
  const recent = new Map(recentIds.map((id, index) => [id, recentIds.length - index]))

  return commands
    .map((command, order) => {
      const label = normalize(command.label)
      const keywords = normalize(command.keywords.join(" "))
      const searchable = `${label} ${keywords}`
      if (!tokens.every((token) => searchable.includes(token))) return undefined
      const score = tokens.reduce((total, token) => {
        if (label.startsWith(token)) return total + 100
        if (label.split(/\s+/).some((word) => word.startsWith(token))) return total + 70
        if (label.includes(token)) return total + 40
        return total + 10
      }, 0)
      return { command, score, recent: recent.get(command.id) ?? 0, order }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) =>
      right.score - left.score || right.recent - left.recent || left.order - right.order,
    )
    .map(({ command }) => command)
}
