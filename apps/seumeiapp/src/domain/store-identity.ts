export type StoreIdentityPresetId = "COSMIC_DINER" | "BRAZILIAN_WARMTH" | "MARKET_FRESH"

export type StoreIdentityTokens = {
  readonly background: string
  readonly foreground: string
  readonly surface: string
  readonly muted: string
  readonly accent: string
  readonly accentForeground: string
  readonly border: string
  readonly radius: string
}

export const STORE_IDENTITY_PRESETS: readonly {
  readonly id: StoreIdentityPresetId
  readonly name: string
  readonly description: string
  readonly displayFamily: "SANS" | "SERIF"
  readonly tokens: StoreIdentityTokens
}[] = [
  { id: "COSMIC_DINER", name: "Cosmic Diner", description: "Noturno, elétrico e editorial.", displayFamily: "SANS", tokens: { background: "#0b1715", foreground: "#f4fff9", surface: "#13231f", muted: "#9fb8ad", accent: "#47e6b1", accentForeground: "#082019", border: "#29443b", radius: "18px" } },
  { id: "BRAZILIAN_WARMTH", name: "Calor Brasileiro", description: "Papel quente, brasa e memória afetiva.", displayFamily: "SERIF", tokens: { background: "#fff7ed", foreground: "#32150d", surface: "#fffdf8", muted: "#77594e", accent: "#9f2d20", accentForeground: "#fff8ef", border: "#ddc8b9", radius: "8px" } },
  { id: "MARKET_FRESH", name: "Mercado Fresco", description: "Claro, direto e orientado ao produto.", displayFamily: "SANS", tokens: { background: "#f7fbf5", foreground: "#16331f", surface: "#ffffff", muted: "#587061", accent: "#176b3a", accentForeground: "#ffffff", border: "#c9d8cc", radius: "12px" } },
] as const

const PRESET_IDS = new Set(STORE_IDENTITY_PRESETS.map(({ id }) => id))

export class InvalidStoreIdentityError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidStoreIdentityError" }
}

export type StoreIdentityDraftInput = {
  readonly preset: StoreIdentityPresetId
  readonly headline: string
  readonly announcement: string
  readonly description: string
  readonly heroImageUrl: string | null
}

function relativeLuminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new InvalidStoreIdentityError("Cor semântica inválida")
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first); const b = relativeLuminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export function getStoreIdentityPreset(id: StoreIdentityPresetId) {
  const preset = STORE_IDENTITY_PRESETS.find((item) => item.id === id)
  if (!preset) throw new InvalidStoreIdentityError("Identidade visual inválida")
  return preset
}

export function validateStoreIdentityDraft(input: StoreIdentityDraftInput): StoreIdentityDraftInput {
  if (!PRESET_IDS.has(input.preset)) throw new InvalidStoreIdentityError("Escolha uma identidade visual válida")
  const headline = input.headline.trim()
  const announcement = input.announcement.trim()
  const description = input.description.trim()
  const heroImageUrl = input.heroImageUrl?.trim() || null
  if (headline.length < 3 || headline.length > 80) throw new InvalidStoreIdentityError("O título deve ter entre 3 e 80 caracteres")
  if (announcement.length > 60) throw new InvalidStoreIdentityError("O aviso deve ter até 60 caracteres")
  if (description.length < 10 || description.length > 280) throw new InvalidStoreIdentityError("A descrição deve ter entre 10 e 280 caracteres")
  if (heroImageUrl && (heroImageUrl.length > 2048 || (!heroImageUrl.startsWith("/") && !heroImageUrl.startsWith("https://")) || heroImageUrl.startsWith("//"))) throw new InvalidStoreIdentityError("Use uma imagem HTTPS ou um asset local")
  return { preset: input.preset, headline, announcement, description, heroImageUrl }
}
