import { randomUUID } from "node:crypto"
import { constants } from "node:fs"
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { BrowserSnapshot, CapsuleView, TabView } from "../src/shared.js"

const documentVersion = 1

export class BrowserSnapshotChangedError extends Error {
  constructor() { super("O perfil mudou durante a operação; revise e tente novamente") }
}

export class BrowserRepository {
  private snapshotValue?: BrowserSnapshot
  private pending: Promise<void> = Promise.resolve()
  constructor(private readonly path: string) {}

  snapshot() {
    return this.enqueue(() => this.currentSnapshot())
  }

  private async currentSnapshot() {
    if (!this.snapshotValue) this.snapshotValue = await this.read()
    return structuredClone(this.snapshotValue)
  }

  mutate(change: (snapshot: MutableSnapshot) => void) {
    return this.enqueue(async () => {
      const mutable = await this.currentSnapshot() as MutableSnapshot
      change(mutable)
      const validated = parseBrowserSnapshot(mutable)
      await this.write(validated)
      this.snapshotValue = validated
      return structuredClone(validated)
    })
  }

  replace(snapshot: BrowserSnapshot, expected?: BrowserSnapshot) {
    const replacement = structuredClone(snapshot)
    const baseline = expected ? structuredClone(expected) : undefined
    return this.enqueue(async () => {
      const validated = parseBrowserSnapshot(replacement)
      if (baseline && JSON.stringify(parseBrowserSnapshot(baseline)) !== JSON.stringify(parseBrowserSnapshot(await this.currentSnapshot()))) throw new BrowserSnapshotChangedError()
      await this.write(validated)
      this.snapshotValue = validated
    })
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation)
    // A failed operation is returned to its caller without poisoning later work.
    this.pending = result.then(() => undefined, () => undefined)
    return result
  }

  private async read(): Promise<BrowserSnapshot> {
    let raw: string
    try { raw = await readFile(this.path, "utf8") }
    catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "ENOENT") return initialSnapshot()
      throw cause
    }
    try {
      const parsed = record(JSON.parse(raw))
      if (parsed.version !== documentVersion) throw new Error("unsupported state")
      const validated = parseBrowserSnapshot(parsed.snapshot)
      return { ...validated, tabs: validated.tabs.map((tab) => ({ ...tab, loading: false })) }
    } catch {
      // Recovery may proceed only after preserving the original bytes.
      await copyFile(this.path, `${this.path}.corrupt-${randomUUID()}.json`, constants.COPYFILE_EXCL)
      return initialSnapshot()
    }
  }

  private async write(snapshot: BrowserSnapshot) {
    await mkdir(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify({ version: documentVersion, snapshot }, null, 2)}\n`, { flag: "wx" })
    await rename(temporary, this.path)
  }
}

function initialSnapshot(): BrowserSnapshot {
  const capsuleId = randomUUID()
  const tabId = randomUUID()
  return {
    capsules: [{ id: capsuleId, name: "Pessoal", policy: "human" }],
    tabs: [{ id: tabId, capsuleId, title: "Nova aba", url: "https://duckduckgo.com/", active: true, loading: false }],
    activeCapsuleId: capsuleId, activeTabId: tabId,
  }
}

export function parseBrowserSnapshot(value: unknown): BrowserSnapshot {
  const source = record(value)
  if (!Array.isArray(source.capsules) || !source.capsules.length || source.capsules.length > 100 ||
      !Array.isArray(source.tabs) || !source.tabs.length || source.tabs.length > 1_000) throw new Error("Perfil de navegador inválido")
  const capsules: CapsuleView[] = source.capsules.map((value: unknown) => {
    const capsule = record(value)
    if (!["human", "agent-safe", "agent-full"].includes(String(capsule.policy))) throw new Error("Política de cápsula inválida")
    return { id: identity(capsule.id), name: boundedText(capsule.name, 50), policy: capsule.policy as CapsuleView["policy"] }
  })
  const ids = new Set(capsules.map(({ id }) => id))
  if (ids.size !== capsules.length) throw new Error("Cápsulas duplicadas")
  const tabs: TabView[] = source.tabs.map((value: unknown) => {
    const tab = record(value)
    const capsuleId = identity(tab.capsuleId)
    const url = boundedText(tab.url, 8_192)
    if (!ids.has(capsuleId) || !["http:", "https:"].includes(new URL(url).protocol) ||
        typeof tab.active !== "boolean" || typeof tab.loading !== "boolean") throw new Error("Aba inválida")
    return { id: identity(tab.id), capsuleId, title: boundedText(tab.title, 120), url, active: tab.active, loading: tab.loading }
  })
  if (new Set(tabs.map(({ id }) => id)).size !== tabs.length || capsules.some(({ id }) => !tabs.some((tab) => tab.capsuleId === id))) throw new Error("Referências de abas inválidas")
  const activeTabId = identity(source.activeTabId)
  const activeCapsuleId = identity(source.activeCapsuleId)
  const active = tabs.filter((tab) => tab.active)
  if (active.length !== 1 || active[0].id !== activeTabId || active[0].capsuleId !== activeCapsuleId) throw new Error("Aba ativa inválida")
  return { capsules, tabs, activeTabId, activeCapsuleId }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Perfil de navegador inválido")
  return value as Record<string, unknown>
}

function boundedText(value: unknown, limit: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new Error("Texto do perfil inválido")
  return value
}

function identity(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)) throw new Error("Identidade de perfil inválida")
  return value
}

interface MutableSnapshot {
  capsules: CapsuleView[]
  tabs: TabView[]
  activeCapsuleId: string
  activeTabId: string
}
