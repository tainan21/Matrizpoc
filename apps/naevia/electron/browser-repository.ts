import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { BrowserSnapshot, CapsuleView, TabView } from "../src/shared.js"

const documentVersion = 1

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
      await this.write(mutable)
      this.snapshotValue = mutable
      return structuredClone(mutable)
    })
  }

  replace(snapshot: BrowserSnapshot) {
    const replacement = structuredClone(snapshot)
    return this.enqueue(async () => {
      await this.write(replacement)
      this.snapshotValue = replacement
    })
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation)
    // A failed operation is returned to its caller without poisoning later work.
    this.pending = result.then(() => undefined, () => undefined)
    return result
  }

  private async read(): Promise<BrowserSnapshot> {
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8")) as { version: number; snapshot: BrowserSnapshot }
      if (parsed.version !== documentVersion) throw new Error("unsupported state")
      return parsed.snapshot
    } catch {
      const capsuleId = randomUUID()
      const tabId = randomUUID()
      return {
        capsules: [{ id: capsuleId, name: "Pessoal", policy: "human" }],
        tabs: [{ id: tabId, capsuleId, title: "Nova aba", url: "https://duckduckgo.com/", active: true, loading: false }],
        activeCapsuleId: capsuleId,
        activeTabId: tabId,
      }
    }
  }

  private async write(snapshot: BrowserSnapshot) {
    await mkdir(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify({ version: documentVersion, snapshot }, null, 2)}\n`, { flag: "wx" })
    await rename(temporary, this.path)
  }
}

interface MutableSnapshot {
  capsules: CapsuleView[]
  tabs: TabView[]
  activeCapsuleId: string
  activeTabId: string
}
