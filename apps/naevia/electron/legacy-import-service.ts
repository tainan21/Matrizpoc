import { randomUUID } from "node:crypto"
import { mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, isAbsolute, join, relative } from "node:path"

import { mapLegacyBrowserState } from "../src/legacy-import.js"
import type { BrowserSnapshot, LegacyImportPreview, LegacyImportStatus } from "../src/shared.js"

interface LegacyRows {
  capsules: readonly { id: string; name: string; policy: string }[]
  tabs: readonly { id: string; capsuleId: string; title: string; url: string; active: boolean }[]
}

interface PendingImport { readonly token: string; readonly database: string; readonly signature: string; readonly expiresAt: number }

export class LegacyImportService {
  private pending?: PendingImport

  constructor(
    private readonly userData: string,
    private readonly legacyRoots: readonly string[],
    private readonly replaceSnapshot: (snapshot: BrowserSnapshot) => Promise<void>,
    private readonly currentSnapshot: () => Promise<BrowserSnapshot>,
    private readonly readLegacy: (database: string) => LegacyRows = readLegacySqlite,
    private readonly now: () => number = Date.now,
  ) {}

  async preview(): Promise<LegacyImportPreview> {
    this.pending = undefined
    const source = await this.findSource()
    if (!source) return { available: false, sourceLabel: "Matriz Control Electron", capsuleCount: 0, tabCount: 0, reason: "Perfil legado não encontrado ou vault não montado." }
    try {
      const rows = this.readLegacy(source.database)
      mapLegacyBrowserState(rows.capsules, rows.tabs, randomUUID)
      const token = randomUUID()
      this.pending = { token, database: source.database, signature: source.signature, expiresAt: this.now() + 5 * 60_000 }
      return { available: true, sourceLabel: source.label, capsuleCount: rows.capsules.length, tabCount: rows.tabs.length, confirmationToken: token }
    } catch {
      return { available: false, sourceLabel: source.label, capsuleCount: 0, tabCount: 0, reason: "O perfil legado é incompatível ou está bloqueado." }
    }
  }

  async confirm(token: string): Promise<LegacyImportStatus> {
    const pending = this.pending
    this.pending = undefined
    if (!pending || pending.token !== token || pending.expiresAt < this.now()) throw new Error("Confirmação de importação inválida ou expirada")
    const source = await this.validateDatabase(pending.database)
    if (source.signature !== pending.signature) throw new Error("O perfil legado mudou; gere uma nova prévia")
    const rows = this.readLegacy(source.database)
    const imported = mapLegacyBrowserState(rows.capsules, rows.tabs, randomUUID)
    const importId = randomUUID()
    const backupPath = join(this.userData, "legacy-import", "backups", `${importId}.json`)
    await atomicJson(backupPath, { version: 1, snapshot: await this.currentSnapshot() })
    await this.replaceSnapshot(imported)
    const importedAt = new Date(this.now()).toISOString()
    await atomicJson(this.journalPath(), { version: 1, importId, importedAt, backupPath, sourceLabel: "Matriz Control Electron" })
    return { canRollback: true, importedAt, message: `${imported.capsules.length} cápsulas importadas. A origem permaneceu intacta.` }
  }

  async status(): Promise<LegacyImportStatus> {
    try {
      const journal = JSON.parse(await readFile(this.journalPath(), "utf8")) as { importedAt: string; backupPath: string }
      await this.validateBackup(journal.backupPath)
      return { canRollback: true, importedAt: journal.importedAt, message: "Importação concluída; rollback disponível." }
    } catch {
      return { canRollback: false, message: "Nenhuma importação ativa." }
    }
  }

  async rollback(): Promise<LegacyImportStatus> {
    const journal = JSON.parse(await readFile(this.journalPath(), "utf8")) as { backupPath: string }
    const backupPath = await this.validateBackup(journal.backupPath)
    const backup = JSON.parse(await readFile(backupPath, "utf8")) as { version: number; snapshot: BrowserSnapshot }
    if (backup.version !== 1) throw new Error("Backup de importação incompatível")
    await this.replaceSnapshot(backup.snapshot)
    await atomicJson(this.journalPath(), { version: 1, rolledBackAt: new Date(this.now()).toISOString() })
    return { canRollback: false, message: "Rollback concluído. O perfil anterior foi restaurado." }
  }

  private journalPath() { return join(this.userData, "legacy-import", "journal.json") }

  private async findSource() {
    for (const root of this.legacyRoots) {
      for (const suffix of [["runtime", "vault", "browser.sqlite"], ["vault", "browser.sqlite"]]) {
        try {
          const found = await this.validateDatabase(join(root, ...suffix))
          return { ...found, label: "Matriz Control Electron" }
        } catch { /* try the next fixed location */ }
      }
    }
    return undefined
  }

  private async validateDatabase(database: string) {
    const canonicalDatabase = await realpath(database)
    const info = await stat(canonicalDatabase)
    if (!info.isFile() || info.size > 256 * 1024 * 1024) throw new Error("Banco legado inválido")
    const insideKnownRoot = await Promise.all(this.legacyRoots.map(async (root) => {
      try { const canonicalRoot = await realpath(root); const child = relative(canonicalRoot, canonicalDatabase); return child !== "" && !child.startsWith("..") && !isAbsolute(child) } catch { return false }
    }))
    if (!insideKnownRoot.some(Boolean)) throw new Error("Banco legado fora das raízes permitidas")
    return { database: canonicalDatabase, signature: `${info.size}:${info.mtimeMs}` }
  }

  private async validateBackup(path: string) {
    const root = await realpath(join(this.userData, "legacy-import", "backups"))
    const canonical = await realpath(path)
    const child = relative(root, canonical)
    if (!child || child.startsWith("..") || isAbsolute(child)) throw new Error("Backup fora do diretório permitido")
    return canonical
  }
}

async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" })
  await rename(temporary, path)
}

function readLegacySqlite(path: string): LegacyRows {
  interface Statement { all(): unknown[] }
  interface Database { prepare(source: string): Statement; close(): void }
  const sqlite = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (path: string, options: { readonly: boolean }) => Database }
  const database = new sqlite.DatabaseSync(path, { readonly: true })
  try {
    const capsules = database.prepare("SELECT id, name, policy FROM capsules ORDER BY rowid LIMIT 101").all() as LegacyRows["capsules"]
    const rawTabs = database.prepare("SELECT id, capsule_id, title, url, active FROM tabs ORDER BY rowid LIMIT 501").all() as readonly { id: string; capsule_id: string; title: string; url: string; active: number }[]
    return { capsules, tabs: rawTabs.map((tab) => ({ id: tab.id, capsuleId: tab.capsule_id, title: tab.title, url: tab.url, active: Boolean(tab.active) })) }
  } finally { database.close() }
}
