import { dirname } from "node:path"
import { mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import type { BrowserRepository } from "../../application/browser-runtime"
import type { BrowserDownload, BrowserTab, Capsule } from "../../domain/browser"

interface CapsuleRow { id: string; name: string; kind: Capsule["kind"]; policy: Capsule["policy"]; search_provider: string; cache_mode: Capsule["cacheMode"]; group_id: string | null }
interface TabRow { id: string; capsule_id: string; url: string; title: string; status: BrowserTab["status"]; pinned_live: number; active: number; last_active_at: string }

export class SqliteBrowserRepository implements BrowserRepository {
  private readonly database: SqliteDatabase

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    const sqlite = createRequire(`${process.cwd()}/package.json`)("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase }
    this.database = new sqlite.DatabaseSync(path)
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS capsules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('human', 'agent')),
        policy TEXT NOT NULL CHECK (policy IN ('human', 'agent-safe', 'agent-full')),
        search_provider TEXT NOT NULL,
        cache_mode TEXT NOT NULL CHECK (cache_mode IN ('persistent', 'memory')),
        group_id TEXT
      );
      CREATE TABLE IF NOT EXISTS tabs (
        id TEXT PRIMARY KEY,
        capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        pinned_live INTEGER NOT NULL,
        active INTEGER NOT NULL,
        last_active_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS tabs_capsule ON tabs(capsule_id);
      CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE, url TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(capsule_id, url));
      CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE, url TEXT, text TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS downloads (id TEXT PRIMARY KEY, capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE, url TEXT NOT NULL, filename TEXT NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, capsule_id TEXT, action TEXT NOT NULL, origin TEXT, result TEXT NOT NULL, created_at TEXT NOT NULL);
    `)
  }

  async listCapsules() {
    const rows = this.database.prepare("SELECT * FROM capsules ORDER BY rowid").all() as unknown as CapsuleRow[]
    return rows.map(toCapsule)
  }

  async saveCapsule(capsule: Capsule) {
    this.database.prepare(`INSERT INTO capsules (id,name,kind,policy,search_provider,cache_mode,group_id) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,policy=excluded.policy,search_provider=excluded.search_provider,cache_mode=excluded.cache_mode,group_id=excluded.group_id`)
      .run(capsule.id, capsule.name, capsule.kind, capsule.policy, JSON.stringify(capsule.searchProvider), capsule.cacheMode, capsule.groupId)
  }

  async getCapsule(id: string) {
    const row = this.database.prepare("SELECT * FROM capsules WHERE id = ?").get(id) as unknown as CapsuleRow | undefined
    return row ? toCapsule(row) : undefined
  }

  async listTabs(capsuleId: string) {
    const rows = this.database.prepare("SELECT * FROM tabs WHERE capsule_id = ? ORDER BY rowid").all(capsuleId) as unknown as TabRow[]
    return rows.map(toTab)
  }

  async saveTab(tab: BrowserTab) {
    this.database.prepare(`INSERT INTO tabs (id,capsule_id,url,title,status,pinned_live,active,last_active_at) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET capsule_id=excluded.capsule_id,url=excluded.url,title=excluded.title,status=excluded.status,pinned_live=excluded.pinned_live,active=excluded.active,last_active_at=excluded.last_active_at`)
      .run(tab.id, tab.capsuleId, tab.url, tab.title, tab.status, Number(tab.pinnedLive), Number(tab.active), tab.lastActiveAt)
  }

  async deleteTab(tabId: string) { this.database.prepare("DELETE FROM tabs WHERE id = ?").run(tabId) }

  async saveDownload(download: BrowserDownload) {
    this.database.prepare(`INSERT INTO downloads (id,capsule_id,url,filename,state,created_at) VALUES (?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET filename=excluded.filename,state=excluded.state`)
      .run(download.id, download.capsuleId, download.url, download.filename, download.state, download.createdAt)
  }

  async searchLibrary(capsuleId: string, query: string) {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`
    const bookmarks = this.database.prepare("SELECT title, url FROM bookmarks WHERE capsule_id = ? AND (title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\') LIMIT 50").all(capsuleId, pattern, pattern) as Array<{ title: string; url: string }>
    const notes = this.database.prepare("SELECT substr(text, 1, 160) AS title, url FROM notes WHERE capsule_id = ? AND text LIKE ? ESCAPE '\\' LIMIT 50").all(capsuleId, pattern) as Array<{ title: string; url: string | null }>
    return [...bookmarks.map((item) => ({ kind: "bookmark" as const, ...item })), ...notes.map((item) => ({ kind: "note" as const, ...item }))]
  }

  close() { this.database.close() }
}

interface SqliteStatement {
  all(...values: unknown[]): unknown[]
  get(...values: unknown[]): unknown
  run(...values: unknown[]): unknown
}
interface SqliteDatabase {
  exec(source: string): void
  prepare(source: string): SqliteStatement
  close(): void
}

function toCapsule(row: CapsuleRow): Capsule { return { id: row.id, name: row.name, kind: row.kind, policy: row.policy, searchProvider: JSON.parse(row.search_provider) as Capsule["searchProvider"], cacheMode: row.cache_mode, groupId: row.group_id } }
function toTab(row: TabRow): BrowserTab { return { id: row.id, capsuleId: row.capsule_id, url: row.url, title: row.title, status: row.status, pinnedLive: Boolean(row.pinned_live), active: Boolean(row.active), lastActiveAt: row.last_active_at } }
