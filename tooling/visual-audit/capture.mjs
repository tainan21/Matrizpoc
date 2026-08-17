import { createRequire } from "node:module"
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  captureKey,
  discoverRoutes,
  expectedCounts,
  mergeCaptureResults,
  remainingAttempts,
  viewports,
} from "./routes.mjs"

const repoRoot = resolve(import.meta.dirname, "..", "..")

function optionValue(name, fallback) {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--"))
    return process.argv[index + 1]
  return fallback
}

function requirePlaywrightFrom(moduleRoot) {
  for (const candidate of [resolve(moduleRoot), resolve(moduleRoot, "node_modules")]) {
    try {
      const require = createRequire(join(candidate, "visual-audit-loader.cjs"))
      return require("playwright")
    } catch {}
  }
  return null
}

function cachedModuleRoots() {
  const cacheRoots = [
    process.env.npm_config_cache,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "npm-cache") : null,
    join(homedir(), ".npm"),
  ].filter(Boolean)
  const candidates = []
  for (const cacheRoot of new Set(cacheRoots)) {
    const npxRoot = join(cacheRoot, "_npx")
    if (!existsSync(npxRoot)) continue
    for (const entry of readdirSync(npxRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const moduleRoot = join(npxRoot, entry.name, "node_modules")
      const packageFile = join(moduleRoot, "playwright", "package.json")
      if (existsSync(packageFile))
        candidates.push({ moduleRoot, modified: statSync(packageFile).mtimeMs })
    }
  }
  return candidates.sort((a, b) => b.modified - a.modified).map((candidate) => candidate.moduleRoot)
}

function loadPlaywright() {
  if (process.env.PLAYWRIGHT_NODE_MODULES) {
    const explicit = requirePlaywrightFrom(process.env.PLAYWRIGHT_NODE_MODULES)
    if (explicit) return explicit
    throw new Error(
      `PLAYWRIGHT_NODE_MODULES não contém playwright: ${process.env.PLAYWRIGHT_NODE_MODULES}`,
    )
  }
  try {
    return createRequire(import.meta.url)("playwright")
  } catch {}
  for (const moduleRoot of cachedModuleRoots()) {
    const cached = requirePlaywrightFrom(moduleRoot)
    if (cached) return cached
  }
  throw new Error(
    "playwright não encontrado no monorepo nem no cache do npx. Execute `npx --yes --package @playwright/cli playwright-cli --help` ou defina PLAYWRIGHT_NODE_MODULES.",
  )
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {})
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(650)
  const loading = await page
    .locator("body")
    .innerText({ timeout: 1_000 })
    .catch(() => "")
  if (/Carregando (Hub|Spot|Seumei|Contratos|WillDash)/i.test(loading)) {
    await page
      .waitForFunction(
        () => !/Carregando (Hub|Spot|Seumei|Contratos|WillDash)/i.test(document.body.innerText),
        null,
        { timeout: 4_000 },
      )
      .catch(() => {})
  }
}

async function visit(page, url) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8_000 })
  await settle(page)
  return response
}

async function unlockWorkbench(page) {
  await visit(page, "http://127.0.0.1:3005/unlock")
  await page.locator('input[name="token"]').fill("1234", { timeout: 4_000 })
  await page.locator('button[type="submit"]').click({ timeout: 4_000 })
  await page.waitForTimeout(1_000)
}

async function authenticateEcosystem(page) {
  const response = await page.context().request.post("http://localhost:3000/api/auth/mock/google", {
    data: { accountId: "google-ana" },
    headers: { origin: "http://localhost:3000" },
  })
  if (!response.ok())
    throw new Error(
      `Falha ao autenticar ecossistema: HTTP ${response.status()} ${await response.text()}`,
    )
  await page.waitForTimeout(250)
}

async function hrefPaths(page, url) {
  await visit(page, url)
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter(Boolean))
    .catch(() => [])
  return hrefs.map((href) => new URL(href, url).pathname)
}

function firstSegments(paths, predicate) {
  for (const path of paths) {
    const segments = path.split("/").filter(Boolean)
    if (predicate(segments)) return segments
  }
  return null
}

async function resolveDynamicSegments(page) {
  const resolved = {}
  const staticDocs = new Set([
    "new",
    "graph",
    "context",
    "entities",
    "settings",
    "tasks",
    "runs",
    "mcp",
    "import",
    "exports",
    "converter",
    "timeline",
    "governance",
    "approvals",
    "suggestions",
    "review-desk",
  ])
  const doc = firstSegments(
    await hrefPaths(page, "http://localhost:3000/docs"),
    (segments) => segments.length === 2 && segments[0] === "docs" && !staticDocs.has(segments[1]),
  )
  if (doc) resolved.docId = doc[1]
  const context = firstSegments(
    await hrefPaths(page, "http://localhost:3000/docs/context"),
    (segments) => segments.length === 3 && segments[0] === "docs" && segments[1] === "context",
  )
  if (context) resolved.contextId = context[2]
  const entity = firstSegments(
    await hrefPaths(page, "http://localhost:3000/docs/entities"),
    (segments) => segments.length === 3 && segments[0] === "docs" && segments[1] === "entities",
  )
  if (entity) resolved.entityId = entity[2]

  const project = firstSegments(
    await hrefPaths(page, "http://127.0.0.1:3005/projects"),
    (segments) => segments.length === 2 && segments[0] === "projects" && segments[1] !== "new",
  )
  if (project) {
    resolved.projectId = project[1]
    const projectBase = `http://127.0.0.1:3005/projects/${resolved.projectId}`
    const item = firstSegments(
      await hrefPaths(page, `${projectBase}/backlog`),
      (segments) =>
        segments.length === 4 &&
        segments[0] === "projects" &&
        segments[1] === resolved.projectId &&
        segments[2] === "backlog",
    )
    if (item) resolved.itemId = item[3]
    const request = firstSegments(
      await hrefPaths(page, `${projectBase}/agents`),
      (segments) =>
        segments.length === 4 &&
        segments[0] === "projects" &&
        segments[1] === resolved.projectId &&
        segments[2] === "agents",
    )
    if (request) resolved.requestId = request[3]
    const document = firstSegments(
      await hrefPaths(page, `${projectBase}/docs`),
      (segments) =>
        segments.length === 5 &&
        segments[0] === "projects" &&
        segments[1] === resolved.projectId &&
        segments[2] === "docs",
    )
    if (document) {
      resolved.kind = document[3]
      resolved.slug = document[4]
    }
  }
  const source = firstSegments(
    await hrefPaths(page, "http://127.0.0.1:3005/knowledge"),
    (segments) => segments.length === 2 && segments[0] === "knowledge",
  )
  if (source) resolved.sourceId = source[1]
  const sprint = firstSegments(
    await hrefPaths(page, "http://127.0.0.1:3005/work/sprints"),
    (segments) => segments.length === 3 && segments[0] === "work" && segments[1] === "sprints",
  )
  if (sprint) resolved.sprintId = sprint[2]
  return resolved
}

async function captureOne(page, item, viewportName, previousResult) {
  const destination = join(
    repoRoot,
    "output",
    "visual-route-audit",
    item.app,
    viewportName,
    `${item.slug}.png`,
  )
  mkdirSync(dirname(destination), { recursive: true })
  const errors = []
  const listener = (message) => {
    if (message.type() === "error") errors.push(message.text())
  }
  page.on("console", listener)
  let lastError
  const usedAttempts = Number.isInteger(previousResult?.attempts) ? previousResult.attempts : 0
  const availableAttempts = remainingAttempts(previousResult)
  if (availableAttempts === 0) return previousResult
  for (let offset = 1; offset <= availableAttempts; offset += 1) {
    const attempt = usedAttempts + offset
    try {
      const url = `http://${item.host}:${item.port}${item.route}`
      const response = await visit(page, url)
      await page.screenshot({ path: destination, fullPage: false, animations: "disabled" })
      const result = {
        ...item,
        viewport: viewportName,
        url,
        finalUrl: page.url(),
        status: response?.status() ?? null,
        title: await page.title(),
        heading: await page
          .locator("h1")
          .first()
          .innerText({ timeout: 1_000 })
          .catch(() => ""),
        text: (
          await page
            .locator("body")
            .innerText({ timeout: 1_000 })
            .catch(() => "")
        )
          .replace(/\s+/g, " ")
          .slice(0, 900),
        consoleErrors: [...new Set(errors)].slice(0, 8),
        attempts: attempt,
        file: destination.slice(repoRoot.length + 1).replaceAll("\\", "/"),
        ok: true,
      }
      page.off("console", listener)
      return result
    } catch (error) {
      lastError = error
      if (offset < availableAttempts) await page.waitForTimeout(500)
    }
  }
  page.off("console", listener)
  return {
    ...item,
    viewport: viewportName,
    attempts: usedAttempts + availableAttempts,
    ok: false,
    error: String(lastError?.message ?? lastError),
  }
}

async function main() {
  const requested = optionValue("--viewports", "desktop,mobile,tv").split(",").filter(Boolean)
  const retryFailed = process.argv.includes("--retry-failed")
  if (new Set(requested).size !== requested.length)
    throw new Error("Viewports duplicados não são permitidos.")
  for (const viewport of requested)
    if (!viewports[viewport]) throw new Error(`Viewport desconhecido: ${viewport}`)

  const initialRoutes = discoverRoutes(repoRoot)
  if (initialRoutes.length !== expectedCounts.routes)
    throw new Error(
      `Esperadas ${expectedCounts.routes} rotas; encontradas ${initialRoutes.length}.`,
    )
  if (initialRoutes.filter((route) => route.access).length !== expectedCounts.access)
    throw new Error("Contagem de acessos divergente.")
  if (initialRoutes.filter((route) => route.tv).length !== expectedCounts.tv)
    throw new Error("Contagem TV divergente.")

  const output = join(repoRoot, "output", "visual-route-audit", "capture-results.json")
  const previousResults = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : []
  if (!Array.isArray(previousResults)) throw new Error("capture-results.json deve conter um array.")
  const previousByKey = new Map(previousResults.map((item) => [captureKey(item), item]))
  const { chromium } = loadPlaywright()
  const browserChannel = optionValue("--channel", process.env.PLAYWRIGHT_CHANNEL ?? "chrome")
  const launchOptions =
    browserChannel === "chromium" ? { headless: true } : { channel: browserChannel, headless: true }
  const browser = await chromium.launch(launchOptions)
  const results = []
  let skippedAtAttemptLimit = 0
  try {
    for (const viewportName of requested) {
      let candidates =
        viewportName === "tv" ? initialRoutes.filter((route) => route.tv) : initialRoutes
      if (retryFailed) {
        candidates = candidates.filter((route) => {
          const previous = previousByKey.get(`${viewportName}:${route.app}:${route.pattern}`)
          if (!previous || previous.ok) return false
          if (remainingAttempts(previous) === 0) {
            skippedAtAttemptLimit += 1
            return false
          }
          return true
        })
      }
      if (!candidates.length) continue
      const context = await browser.newContext({
        viewport: viewports[viewportName],
        deviceScaleFactor: 1,
        colorScheme: "light",
      })
      const page = await context.newPage()
      for (const item of candidates.filter((route) => route.access)) {
        const previous = retryFailed
          ? previousByKey.get(`${viewportName}:${item.app}:${item.pattern}`)
          : undefined
        results.push(await captureOne(page, item, viewportName, previous))
        console.log(`[${results.length}] ${viewportName} ${item.app}:${item.route}`)
      }
      await authenticateEcosystem(page)
      await unlockWorkbench(page)
      const resolved = await resolveDynamicSegments(page)
      const routes = discoverRoutes(repoRoot, resolved)
      const byPattern = new Map(routes.map((route) => [`${route.app}:${route.pattern}`, route]))
      for (const initial of candidates.filter((route) => !route.access)) {
        const item = byPattern.get(`${initial.app}:${initial.pattern}`) ?? initial
        const previous = retryFailed
          ? previousByKey.get(`${viewportName}:${item.app}:${item.pattern}`)
          : undefined
        results.push(await captureOne(page, item, viewportName, previous))
        console.log(`[${results.length}] ${viewportName} ${item.app}:${item.route}`)
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }

  mkdirSync(dirname(output), { recursive: true })
  const finalResults = mergeCaptureResults(previousResults, results, requested, retryFailed)
  writeFileSync(output, `${JSON.stringify(finalResults, null, 2)}\n`)
  const ok = results.filter((item) => item.ok).length
  console.log(
    JSON.stringify({
      requested,
      channel: browserChannel,
      retried: retryFailed,
      total: results.length,
      ok,
      failed: results.length - ok,
      skippedAtAttemptLimit,
      indexed: finalResults.length,
      output,
    }),
  )
  if (
    !retryFailed &&
    results.length !== requested.reduce((total, name) => total + (name === "tv" ? 14 : 101), 0)
  )
    process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
