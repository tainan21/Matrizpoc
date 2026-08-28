import { createHash, createPublicKey, randomUUID, verify as verifySignature } from "node:crypto"
import { access, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises"
import { spawn } from "node:child_process"
import path from "node:path"

type Installation = {
  installationId: string
  registryKey: string
  displayName: string
  publisher: string
  version: string | null
  installLocation: string | null
  estimatedBytes: number
  uninstallCommand: string
}
type Result = { operationId: string; status: "completed" | "cancelled" | "failed"; message: string }
type Candidate = {
  id: string
  category: "cache" | "logs" | "temporary"
  displayPath: string
  estimatedBytes: number
}
type CatalogProduct = {
  productId: string
  windows: { publisher: string }
  release: null | {
    version: string
    status: string
    signature: string
    installer: { fileName: string; downloadUrl: string; sizeBytes: number; sha256: string }
  }
}
const installations = new Map<string, Installation>()
const candidates = new Map<string, Candidate>()
const MAX_INSTALLER_BYTES = 512 * 1024 * 1024

const approvedNames = /^(Matriz|Seu ?Mei)/i
const ps = (script: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
      shell: false,
    })
    let output = "",
      error = ""
    child.stdout.on("data", (chunk) => (output += String(chunk)))
    child.stderr.on("data", (chunk) => (error += String(chunk)))
    child.once("error", reject)
    child.once("close", (code) =>
      code === 0 ? resolve(output) : reject(new Error(error || `PowerShell terminou com ${code}`)),
    )
  })

export async function discoverInstalled(): Promise<Installation[]> {
  const script = `$roots=@('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'); Get-ItemProperty $roots -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match '^(Matriz|Seu ?Mei)' } | Select-Object PSPath,DisplayName,Publisher,DisplayVersion,InstallLocation,EstimatedSize,QuietUninstallString,UninstallString | ConvertTo-Json -Compress`
  const raw = (await ps(script)).trim()
  const rows = raw ? JSON.parse(raw) : []
  const list = (Array.isArray(rows) ? rows : [rows]).flatMap((row: Record<string, unknown>) => {
    const displayName = String(row.DisplayName ?? "")
    const publisher = String(row.Publisher ?? "")
    const uninstallCommand = String(row.QuietUninstallString ?? row.UninstallString ?? "")
    if (!approvedNames.test(displayName) || !uninstallCommand) return []
    const registryKey = String(row.PSPath ?? "")
    const installationId = createHash("sha256").update(registryKey).digest("hex").slice(0, 24)
    return [
      {
        installationId,
        registryKey,
        displayName,
        publisher,
        version: row.DisplayVersion ? String(row.DisplayVersion) : null,
        installLocation: row.InstallLocation ? String(row.InstallLocation) : null,
        estimatedBytes: Number(row.EstimatedSize ?? 0) * 1024,
        uninstallCommand,
      },
    ]
  })
  installations.clear()
  list.forEach((item) => installations.set(item.installationId, item))
  return list
}

function splitCommand(command: string) {
  if (/[&|<>`\r\n]/.test(command)) throw new Error("Operador de shell recusado")
  const match = command.trim().match(/^(?:"([^"]+)"|(\S+))(?:\s+(.*))?$/)
  if (!match) throw new Error("Comando inválido")
  const executable = match[1] ?? match[2]
  const rest = match[3] ?? ""
  const args = [...rest.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2])
  const base = path.basename(executable).toLowerCase()
  if (base !== "msiexec.exe" && !base.includes("uninstall") && !base.includes("unins"))
    throw new Error("Desinstalador não aprovado")
  if (base === "msiexec.exe" && !args.some((arg) => /^\{[0-9a-f-]{36}\}$/i.test(arg)))
    throw new Error("MSI sem GUID catalogado")
  return { executable, args }
}

async function run(executable: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: false, detached: false })
    child.once("error", reject)
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`Processo terminou com ${code}`)),
    )
  })
}
export function launchDetachedUninstaller(installationId: string): Result {
  const item = installations.get(installationId)
  if (!item) return result("failed", "Instalação não pertence à inspeção atual")
  try {
    if (item.publisher !== "Matriz") throw new Error("Publisher do produto não foi aprovado")
    const command = splitCommand(item.uninstallCommand)
    const child = spawn(command.executable, command.args, {
      shell: false,
      windowsHide: false,
      detached: true,
      stdio: "ignore",
    })
    child.unref()
    return result("completed", "Auto-desinstalador iniciado")
  } catch (error) {
    return result("failed", error instanceof Error ? error.message : String(error))
  }
}
const result = (status: Result["status"], message: string): Result => ({
  operationId: randomUUID(),
  status,
  message,
})
export async function uninstall(installationId: string): Promise<Result> {
  const item = installations.get(installationId)
  if (!item) return result("failed", "Instalação não pertence à inspeção atual")
  try {
    if (item.publisher !== "Matriz") throw new Error("Publisher do produto não foi aprovado")
    const command = splitCommand(item.uninstallCommand)
    const installRoot = item.installLocation?.replace(/^"|"$/g, "")
    if (
      path.basename(command.executable).toLowerCase() !== "msiexec.exe" &&
      installRoot &&
      path.relative(installRoot, command.executable).startsWith("..")
    )
      throw new Error("Desinstalador está fora do caminho instalado")
    await access(command.executable)
    await run(command.executable, command.args)
    await discoverInstalled()
    return installations.has(installationId)
      ? result("failed", "O desinstalador terminou, mas o registro ainda existe")
      : result("completed", "Produto removido e registro confirmado")
  } catch (error) {
    return result("failed", error instanceof Error ? error.message : String(error))
  }
}
export async function unsupported(action: string): Promise<Result> {
  return result(
    "failed",
    `${action}: nenhuma release Windows publicada e verificada está disponível`,
  )
}

function canonicalManifest(product: CatalogProduct): string {
  const release = product.release!
  return [
    product.productId,
    release.version,
    release.installer.downloadUrl,
    String(release.installer.sizeBytes),
    release.installer.sha256,
  ].join("\n")
}
async function verifiedInstaller(productId: string, cacheRoot: string): Promise<string> {
  const hub = process.env.MATRIZ_HUB_URL ?? "http://127.0.0.1:3000"
  const response = await fetch(`${hub}/api/v1/distribution/catalog`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Hub respondeu ${response.status}`)
  const payload = (await response.json()) as { products: CatalogProduct[] }
  const product = payload.products.find((item) => item.productId === productId)
  if (!product?.release || product.release.status !== "published")
    throw new Error("Nenhuma release publicada")
  const installer = product.release.installer
  if (
    !Number.isSafeInteger(installer.sizeBytes) ||
    installer.sizeBytes <= 0 ||
    installer.sizeBytes > MAX_INSTALLER_BYTES
  )
    throw new Error("Tamanho do instalador está fora do limite permitido")
  if (
    !/^[a-z0-9][a-z0-9._ -]*\.exe$/i.test(installer.fileName) ||
    path.basename(installer.fileName) !== installer.fileName
  )
    throw new Error("Nome do instalador é inválido")
  if (!/^[a-f0-9]{64}$/.test(installer.sha256)) throw new Error("SHA-256 do manifesto é inválido")
  const publicKey = process.env.MATRIZ_DISTRIBUTION_PUBLIC_KEY
  if (!publicKey) throw new Error("Chave pública de distribuição não configurada")
  const rawKey = Buffer.from(publicKey, "base64")
  if (rawKey.length !== 32) throw new Error("Chave pública deve ter 32 bytes")
  const signature = Buffer.from(product.release.signature, "base64")
  const key = createPublicKey({
    key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), rawKey]),
    format: "der",
    type: "spki",
  })
  if (!verifySignature(null, Buffer.from(canonicalManifest(product)), key, signature))
    throw new Error("Assinatura do manifesto inválida")
  const source = new URL(product.release.installer.downloadUrl)
  if (source.protocol !== "https:") throw new Error("Instalador está fora de HTTPS")
  const download = await fetch(source, { redirect: "manual" })
  if (!download.ok || download.status >= 300)
    throw new Error(`Download recusado (${download.status})`)
  const contentLength = Number(download.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength !== installer.sizeBytes)
    throw new Error("Content-Length diverge do manifesto")
  const bytes = Buffer.from(await download.arrayBuffer())
  if (bytes.length !== product.release.installer.sizeBytes)
    throw new Error("Tamanho do instalador diverge do manifesto")
  if (createHash("sha256").update(bytes).digest("hex") !== product.release.installer.sha256)
    throw new Error("SHA-256 do instalador inválido")
  await mkdir(cacheRoot, { recursive: true })
  const temporary = path.join(cacheRoot, `${randomUUID()}.partial`)
  const target = path.join(cacheRoot, product.release.installer.fileName)
  await writeFile(temporary, bytes, { flag: "wx" })
  await rename(temporary, target)
  const escaped = target.replace(/'/g, "''")
  const trust = JSON.parse(
    (
      await ps(
        `Get-AuthenticodeSignature -LiteralPath '${escaped}' | Select-Object Status,@{n='Subject';e={$_.SignerCertificate.Subject}} | ConvertTo-Json -Compress`,
      )
    ).trim(),
  ) as { Status: string; Subject: string }
  if (
    trust.Status !== "Valid" ||
    !trust.Subject?.toLowerCase().includes(product.windows.publisher.toLowerCase())
  )
    throw new Error("Assinatura Authenticode ou publisher inválido")
  return target
}
export async function install(productId: string, cacheRoot: string): Promise<Result> {
  try {
    const installer = await verifiedInstaller(productId, cacheRoot)
    await run(installer, ["/S"])
    await discoverInstalled()
    return result("completed", "Instalador assinado concluído e Windows reinspecionado")
  } catch (error) {
    return result("failed", error instanceof Error ? error.message : String(error))
  }
}

async function sizeOf(target: string): Promise<number> {
  try {
    const info = await stat(target)
    if (info.isFile()) return info.size
    return (await readdir(target, { withFileTypes: true })).reduce(
      async (total, entry) => (await total) + (await sizeOf(path.join(target, entry.name))),
      Promise.resolve(0),
    )
  } catch {
    return 0
  }
}
export async function cleanupPreview(productId: string, userData: string): Promise<Candidate[]> {
  const roots = [
    { category: "cache" as const, p: path.join(userData, "products", productId, "cache") },
    { category: "logs" as const, p: path.join(userData, "products", productId, "logs") },
    { category: "temporary" as const, p: path.join(userData, "products", productId, "temp") },
  ]
  const found: Candidate[] = []
  for (const root of roots) {
    try {
      await access(root.p)
      const item = {
        id: createHash("sha256").update(root.p).digest("hex").slice(0, 24),
        category: root.category,
        displayPath: root.p,
        estimatedBytes: await sizeOf(root.p),
      }
      candidates.set(item.id, item)
      found.push(item)
    } catch {}
  }
  return found
}
export async function cleanup(ids: readonly string[]): Promise<Result> {
  try {
    for (const id of ids) {
      const item = candidates.get(id)
      if (!item) throw new Error("Candidato não pertence à inspeção atual")
      await rm(item.displayPath, { recursive: true, force: false })
    }
    return result("completed", "Resíduos allowlisted removidos")
  } catch (error) {
    return result("failed", error instanceof Error ? error.message : String(error))
  }
}
