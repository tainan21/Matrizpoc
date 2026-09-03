import { createHash, randomUUID } from "node:crypto"
import { execFile } from "node:child_process"
import { createReadStream } from "node:fs"
import { lstat, mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, isAbsolute, join, relative } from "node:path"
import { promisify } from "node:util"

import { mapLegacyBrowserState } from "../src/legacy-import.js"
import { parseBrowserSnapshot } from "./browser-repository.js"
import type { BrowserSnapshot, LegacyImportPreview, LegacyImportStatus } from "../src/shared.js"

interface LegacyRows {
  capsules: readonly { id: string; name: string; policy: string }[]
  tabs: readonly { id: string; capsuleId: string; title: string; url: string; active: boolean }[]
}

interface PendingImport { readonly token: string; readonly database: string; readonly signature: string; readonly expiresAt: number }

export class LegacyImportService {
  private pending?: PendingImport
  private inProgress = false

  constructor(
    private readonly userData: string,
    private readonly legacyRoots: readonly string[],
    private readonly replaceSnapshot: (snapshot: BrowserSnapshot) => Promise<void>,
    private readonly currentSnapshot: () => Promise<BrowserSnapshot>,
    private readonly readLegacy: (database: string) => LegacyRows = readLegacySqlite,
    private readonly now: () => number = Date.now,
    private readonly assertSourceClosed: () => Promise<void> = assertLegacyClosed,
  ) {}

  async preview(): Promise<LegacyImportPreview> {
    if (this.inProgress) return { available: false, sourceLabel: "Matriz Control Electron", capsuleCount: 0, tabCount: 0, reason: "Uma operação de importação está em andamento" }
    this.pending = undefined
    if (await this.hasPendingRecovery()) return { available: false, sourceLabel: "Matriz Control Electron", capsuleCount: 0, tabCount: 0, reason: "Conclua o rollback ou a recuperação da importação anterior antes de importar novamente" }
    try { await this.assertSourceClosed() }
    catch (cause) { return { available: false, sourceLabel: "Matriz Control Electron", capsuleCount: 0, tabCount: 0, reason: (cause as Error).message } }
    const source = await this.findSource()
    if (!source) return { available: false, sourceLabel: "Matriz Control Electron", capsuleCount: 0, tabCount: 0, reason: "Perfil legado não encontrado ou vault não montado." }
    try {
      const rows = this.readLegacy(source.database)
      mapLegacyBrowserState(rows.capsules, rows.tabs, randomUUID)
      if ((await this.validateDatabase(source.database)).signature !== source.signature) throw new Error("Origem alterada durante a leitura")
      const token = randomUUID()
      this.pending = { token, database: source.database, signature: source.signature, expiresAt: this.now() + 5 * 60_000 }
      return { available: true, sourceLabel: source.label, capsuleCount: rows.capsules.length, tabCount: rows.tabs.length, confirmationToken: token }
    } catch {
      return { available: false, sourceLabel: source.label, capsuleCount: 0, tabCount: 0, reason: "O perfil legado é incompatível ou está bloqueado." }
    }
  }

  confirm(token: string): Promise<LegacyImportStatus> {
    return this.exclusive(() => this.confirmImport(token))
  }

  private async confirmImport(token: string): Promise<LegacyImportStatus> {
    const pending = this.pending
    this.pending = undefined
    if (!pending || pending.token !== token || pending.expiresAt <= this.now()) throw new Error("Confirmação de importação inválida ou expirada")
    if (await this.hasPendingRecovery()) throw new Error("Conclua o rollback da importação anterior")
    await this.assertSourceClosed()
    const source = await this.validateDatabase(pending.database)
    if (source.signature !== pending.signature) throw new Error("O perfil legado mudou; gere uma nova prévia")
    const rows = this.readLegacy(source.database)
    const imported = parseBrowserSnapshot(mapLegacyBrowserState(rows.capsules, rows.tabs, randomUUID))
    await this.assertSourceClosed()
    if ((await this.validateDatabase(source.database)).signature !== pending.signature) throw new Error("O perfil legado mudou; gere uma nova prévia")
    const importId = randomUUID()
    const backupPath = join(this.userData, "legacy-import", "backups", `${importId}.json`)
    await atomicJson(backupPath, { version: 1, snapshot: parseBrowserSnapshot(await this.currentSnapshot()) })
    const importedAt = new Date(this.now()).toISOString()
    const journal = { version: 1, phase: "prepared", importId, importedAt, backupPath, sourceLabel: "Matriz Control Electron" }
    await atomicJson(this.journalPath(), journal)
    await this.assertSourceClosed()
    if ((await this.validateDatabase(source.database)).signature !== pending.signature) throw new Error("O perfil legado mudou; gere uma nova prévia")
    await this.replaceSnapshot(imported)
    await atomicJson(this.journalPath(), { ...journal, phase: "active" })
    return { canRollback: true, importedAt, message: `${imported.capsules.length} cápsulas importadas. A origem permaneceu intacta.` }
  }

  async status(): Promise<LegacyImportStatus> {
    try {
      const { journal } = await this.recovery()
      return { canRollback: true, importedAt: journal.importedAt, message: journal.phase === "active" ? "Importação concluída; rollback disponível." : "Operação interrompida; recuperação disponível." }
    } catch {
      return { canRollback: false, message: "Nenhuma importação ativa." }
    }
  }

  rollback(): Promise<LegacyImportStatus> {
    return this.exclusive(() => this.restoreBackup())
  }

  private async restoreBackup(): Promise<LegacyImportStatus> {
    const { journal, snapshot } = await this.recovery()
    const replacedProfileBackup = join(this.userData, "legacy-import", "backups", `rollback-${randomUUID()}.json`)
    await atomicJson(replacedProfileBackup, { version: 1, snapshot: parseBrowserSnapshot(await this.currentSnapshot()) })
    await atomicJson(this.journalPath(), { ...journal, phase: "rollback_prepared", replacedProfileBackup })
    await this.replaceSnapshot(snapshot)
    await atomicJson(this.journalPath(), { version: 1, rolledBackAt: new Date(this.now()).toISOString(), replacedProfileBackup })
    return { canRollback: false, message: "Rollback concluído. O perfil anterior foi restaurado; uma cópia do perfil substituído foi preservada." }
  }

  private async recovery() {
    const journal = JSON.parse(await readFile(this.journalPath(), "utf8")) as { version: number; phase: string; importedAt: string; backupPath: string }
    if (!journal || journal.version !== 1 || !["prepared", "active", "rollback_prepared"].includes(journal.phase) ||
        typeof journal.importedAt !== "string" || !Number.isFinite(Date.parse(journal.importedAt)) || typeof journal.backupPath !== "string") throw new Error("Journal de importação incompatível")
    const backupPath = await this.validateBackup(journal.backupPath)
    const backup = JSON.parse(await readFile(backupPath, "utf8")) as { version: number; snapshot: BrowserSnapshot }
    if (!backup || backup.version !== 1) throw new Error("Backup de importação incompatível")
    return { journal, snapshot: parseBrowserSnapshot(backup.snapshot) }
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.inProgress) throw new Error("Uma operação de importação está em andamento")
    this.inProgress = true
    try { return await operation() }
    finally { this.inProgress = false }
  }

  private journalPath() { return join(this.userData, "legacy-import", "journal.json") }

  private async hasPendingRecovery(): Promise<boolean> {
    try {
      const journal = JSON.parse(await readFile(this.journalPath(), "utf8")) as { version: number; rolledBackAt?: string }
      return !journal || journal.version !== 1 || typeof journal.rolledBackAt !== "string" || !Number.isFinite(Date.parse(journal.rolledBackAt))
    } catch (cause) { return (cause as NodeJS.ErrnoException).code !== "ENOENT" }
  }

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
    // A non-empty WAL may contain committed data absent from browser.sqlite.
    // Require a clean legacy shutdown instead of importing a partial database.
    try {
      const wal = await lstat(`${canonicalDatabase}-wal`)
      if (wal.isSymbolicLink() || !wal.isFile() || wal.size > 0) throw new Error("Banco legado com transação pendente; abra e feche o legado antes de importar")
    } catch (cause) { if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause }
    const hash = createHash("sha256")
    let bytes = 0
    for await (const chunk of createReadStream(canonicalDatabase)) {
      bytes += (chunk as Buffer).length
      if (bytes > 256 * 1024 * 1024) throw new Error("Banco legado excedeu o limite de tamanho")
      hash.update(chunk)
    }
    return { database: canonicalDatabase, signature: hash.digest("hex") }
  }

  private async validateBackup(path: string) {
    const root = await realpath(join(this.userData, "legacy-import", "backups"))
    const canonical = await realpath(path)
    const child = relative(root, canonical)
    if (!child || child.startsWith("..") || isAbsolute(child)) throw new Error("Backup fora do diretório permitido")
    return canonical
  }
}

async function assertLegacyClosed(): Promise<void> {
  if (process.platform !== "win32") throw new Error("Verificação do legado disponível somente no Windows")
  let output: string
  try {
    const result = await promisify(execFile)(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tasklist.exe"),
      ["/FI", "IMAGENAME eq Matriz Control Electron.exe", "/FO", "CSV", "/NH"],
      { windowsHide: true, timeout: 5_000, maxBuffer: 512 * 1024, encoding: "utf8" })
    output = result.stdout
  } catch { throw new Error("Não foi possível verificar se o legado está fechado; importação bloqueada") }
  if (output.split(/\r?\n/).some((line) => /^"Matriz Control Electron\.exe",/i.test(line.trim()))) throw new Error("Feche o Matriz Control Electron antes de importar")
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
