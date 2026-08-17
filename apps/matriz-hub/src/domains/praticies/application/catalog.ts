import type { PracticeDefinition } from "../domain/types"

export const praticiesCatalog = [
  {
    id: "patterns",
    name: "Project patterns",
    eyebrow: "Directory intelligence",
    description: "Mapeia a estrutura do workspace para leitura humana e contexto de agentes.",
    kind: "automation",
    availability: "ready",
  },
  {
    id: "validation-recipes",
    name: "Validation recipes",
    eyebrow: "Command snippets",
    description: "Comandos de validação do Hub prontos para copiar sem procurar documentação.",
    kind: "snippet",
    availability: "ready",
  },
  {
    id: "project-compass",
    name: "Project compass",
    eyebrow: "Operational shortcuts",
    description: "Atalhos para saúde, ecossistema e documentação institucional.",
    kind: "shortcut",
    availability: "ready",
  },
  {
    id: "release-notes",
    name: "Release notes",
    eyebrow: "Delivery template",
    description: "Estrutura curta para comunicar mudanças, validações e riscos de uma entrega.",
    kind: "snippet",
    availability: "ready",
  },
  {
    id: "context-brief",
    name: "Context brief",
    eyebrow: "Agent handoff",
    description: "Compõe um pacote curto de contexto para iniciar sessões de trabalho.",
    kind: "gadget",
    availability: "planned",
  },
] as const satisfies readonly PracticeDefinition[]
