import { existsSync, readFileSync } from "node:fs"
import { dirname, relative, resolve } from "node:path"
import {
  captureKey,
  discoverRoutes,
  dynamicSegmentNames,
  expectedCaptureItems,
  expectedCounts,
  routeMatchesPattern,
  routeSlug,
  viewports,
} from "./routes.mjs"

const repoRoot = resolve(import.meta.dirname, "..", "..")
const args = process.argv.slice(2)
const failures = []

function hasFlag(name) {
  return args.includes(name) || args.some((argument) => argument.startsWith(`${name}=`))
}

function optionValue(name, fallback) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = args.indexOf(name)
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) return args[index + 1]
  return fallback
}

function duplicates(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value)
}

function normalizedFile(value) {
  return typeof value === "string" ? value.replaceAll("\\", "/") : value
}

function readPngDimensions(path) {
  const buffer = readFileSync(path)
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    buffer.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    throw new Error("PNG inválido")
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

function validateSegmentResolution(result) {
  const names = dynamicSegmentNames(result.pattern)
  if (!names.length || result.segmentResolution === undefined) return
  const patternSegments = result.pattern.split("/")
  const routeSegments = result.route.split("/")
  for (const name of names) {
    const index = patternSegments.indexOf(`[${name}]`)
    const resolution = result.segmentResolution?.[name]
    if (
      !resolution ||
      resolution.value !== routeSegments[index] ||
      !["resolved", "fallback"].includes(resolution.source)
    ) {
      failures.push(`segmento inválido: ${captureKey(result)}:${name}`)
    }
  }
}

const routes = discoverRoutes(repoRoot)
const access = routes.filter((route) => route.access).length
const tv = routes.filter((route) => route.tv).length
if (routes.length !== expectedCounts.routes) failures.push(`routes=${routes.length}`)
if (access !== expectedCounts.access) failures.push(`access=${access}`)
if (tv !== expectedCounts.tv) failures.push(`tv=${tv}`)
for (const value of duplicates(routes.map((route) => `${route.app}:${route.route}`)))
  failures.push(`URL duplicada: ${value}`)
for (const value of duplicates(routes.map((route) => `${route.app}:${route.slug}`)))
  failures.push(`slug duplicado: ${value}`)

const validateAll = hasFlag("--all")
const validateArtifacts = validateAll || hasFlag("--artifacts")
const validateReport = validateAll || hasFlag("--report")
const validateComponents = validateAll || hasFlag("--components")
const resultsPath = resolve(repoRoot, "output", "visual-route-audit", "capture-results.json")
let results = null
let captures = null

function loadResults() {
  if (results) return results
  if (!existsSync(resultsPath)) {
    failures.push("capture-results ausente")
    return null
  }
  try {
    const parsed = JSON.parse(readFileSync(resultsPath, "utf8"))
    if (!Array.isArray(parsed)) {
      failures.push("capture-results não é array")
      return null
    }
    results = parsed
    captures = results.length
    return results
  } catch (error) {
    failures.push(`capture-results inválido: ${error.message}`)
    return null
  }
}

if (validateArtifacts) {
  const loaded = loadResults()
  if (loaded) {
    const expected = expectedCaptureItems(routes)
    const expectedByKey = new Map(expected.map((item) => [captureKey(item), item]))
    const resultKeys = loaded.map(captureKey)
    const resultFiles = loaded.map((result) => normalizedFile(result.file)).filter(Boolean)
    if (loaded.length !== expectedCounts.captures) failures.push(`captures=${loaded.length}`)
    for (const key of duplicates(resultKeys)) failures.push(`captura duplicada: ${key}`)
    for (const file of duplicates(resultFiles)) failures.push(`arquivo duplicado: ${file}`)
    const actualKeys = new Set(resultKeys)
    for (const key of expectedByKey.keys())
      if (!actualKeys.has(key)) failures.push(`captura ausente: ${key}`)
    for (const key of actualKeys)
      if (!expectedByKey.has(key)) failures.push(`captura extra: ${key}`)

    for (const result of loaded) {
      const key = captureKey(result)
      const manifest = expectedByKey.get(key)
      if (!manifest) continue
      if (result.ok !== true) failures.push(`captura falhou: ${key}`)
      if (!Number.isInteger(result.attempts) || result.attempts < 1 || result.attempts > 2)
        failures.push(`tentativas inválidas: ${key}`)
      if (!Number.isInteger(result.status) || result.status < 100 || result.status > 599)
        failures.push(`status inválido: ${key}`)
      if (
        result.index !== manifest.index ||
        result.app !== manifest.app ||
        result.pattern !== manifest.pattern ||
        result.host !== manifest.host ||
        result.port !== manifest.port ||
        result.access !== manifest.access ||
        result.tv !== manifest.tv
      ) {
        failures.push(`manifesto divergente: ${key}`)
      }
      if (typeof result.route !== "string" || !routeMatchesPattern(result.route, manifest.pattern))
        failures.push(`rota divergente: ${key}`)
      const expectedSlug = typeof result.route === "string" ? routeSlug(result.route) : null
      if (result.slug !== expectedSlug) failures.push(`slug divergente: ${key}`)
      const expectedUrl =
        typeof result.route === "string"
          ? `http://${manifest.host}:${manifest.port}${result.route}`
          : null
      if (result.url !== expectedUrl) failures.push(`URL divergente: ${key}`)
      try {
        const finalUrl = new URL(result.finalUrl)
        if (finalUrl.origin !== `http://${manifest.host}:${manifest.port}`)
          failures.push(`finalUrl fora da origem: ${key}`)
      } catch {
        failures.push(`finalUrl inválida: ${key}`)
      }
      const expectedFile = expectedSlug
        ? `output/visual-route-audit/${manifest.app}/${result.viewport}/${expectedSlug}.png`
        : null
      const file = normalizedFile(result.file)
      if (file !== expectedFile) failures.push(`arquivo divergente: ${key}`)
      if (file) {
        const absoluteFile = resolve(repoRoot, file)
        if (!existsSync(absoluteFile)) failures.push(`imagem ausente: ${file}`)
        else {
          try {
            const dimensions = readPngDimensions(absoluteFile)
            const expectedDimensions = viewports[result.viewport]
            if (
              !expectedDimensions ||
              dimensions.width !== expectedDimensions.width ||
              dimensions.height !== expectedDimensions.height
            ) {
              failures.push(`dimensão inválida: ${file}=${dimensions.width}x${dimensions.height}`)
            }
          } catch (error) {
            failures.push(`imagem inválida: ${file}: ${error.message}`)
          }
        }
      }
      validateSegmentResolution(result)
    }
  }
}

const defaultReportPath = resolve(repoRoot, "docs", "visual-route-audit-2026-08-17.md")
const reportPath = resolve(
  repoRoot,
  optionValue("--report", optionValue("--components", defaultReportPath)),
)
let entries = null
let components = null
let imageLinks = null
if (validateReport || validateComponents) {
  if (!existsSync(reportPath)) failures.push(`relatório ausente: ${reportPath}`)
  else {
    const report = readFileSync(reportPath, "utf8")
    if (validateReport) {
      entries = [...report.matchAll(/^#{2,3} (\d{1,3})\. /gm)].map((match) => Number(match[1]))
      imageLinks = [
        ...report.matchAll(/\]\((\.\.\/output\/visual-route-audit\/[^)]+\.png)\)/g),
      ].map((match) => match[1])
      if (
        entries.length !== expectedCounts.routes ||
        entries.some((value, index) => value !== index + 1)
      )
        failures.push(`entradas=${entries.length}`)
      if (imageLinks.length !== expectedCounts.captures)
        failures.push(`links-imagem=${imageLinks.length}`)
      for (const link of duplicates(imageLinks)) failures.push(`link duplicado: ${link}`)
      const viewportLinks = Object.fromEntries(
        Object.keys(viewports).map((viewport) => [
          viewport,
          imageLinks.filter((link) => link.includes(`/${viewport}/`)).length,
        ]),
      )
      if (viewportLinks.desktop !== expectedCounts.routes)
        failures.push(`links-desktop=${viewportLinks.desktop}`)
      if (viewportLinks.mobile !== expectedCounts.routes)
        failures.push(`links-mobile=${viewportLinks.mobile}`)
      if (viewportLinks.tv !== expectedCounts.tv) failures.push(`links-tv=${viewportLinks.tv}`)
      for (const link of imageLinks)
        if (!existsSync(resolve(dirname(reportPath), link))) failures.push(`link quebrado: ${link}`)
      const linkedResults = loadResults()
      if (linkedResults) {
        const linkedFiles = new Set(
          imageLinks.map((link) =>
            normalizedFile(relative(repoRoot, resolve(dirname(reportPath), link))),
          ),
        )
        const capturedFiles = new Set(linkedResults.map((result) => normalizedFile(result.file)))
        for (const file of capturedFiles)
          if (!linkedFiles.has(file)) failures.push(`captura sem link: ${file}`)
        for (const file of linkedFiles)
          if (!capturedFiles.has(file)) failures.push(`link sem captura: ${file}`)
      }
    }
    if (validateComponents) {
      const componentMatches = [...report.matchAll(/\*\*C(\d{3}) — ([^*]+?)\*\*/g)]
      components = componentMatches.map((match) => Number(match[1]))
      const componentNames = componentMatches.map((match) => match[2].trim())
      if (components.length !== 100 || components.some((value, index) => value !== index + 1))
        failures.push(`componentes=${components.length}`)
      for (const name of duplicates(componentNames)) failures.push(`componente duplicado: ${name}`)
      if (/from\s+["'][^"']*apps[\\/][^"']+[\\/](?:src|app)[\\/]/.test(report))
        failures.push("import cruzado de app proposto")
    }
  }
}

console.log(
  JSON.stringify({
    routes: routes.length,
    access,
    tv,
    captures,
    entries: entries?.length ?? null,
    components: components?.length ?? null,
    imageLinks: imageLinks?.length ?? null,
    failures,
  }),
)
if (failures.length) process.exitCode = 1
