import { readdir, stat } from "node:fs/promises"
import path from "node:path"

export interface StaticAssetMetrics {
  available: boolean
  totalBytes: number
  javascriptBytes: number
  cssBytes: number
  fileCount: number
  largestAsset?: {
    path: string
    bytes: number
  }
}

async function walk(folder: string, root: string): Promise<Array<{ path: string; bytes: number }>> {
  const entries = await readdir(folder, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry): Promise<Array<{ path: string; bytes: number }>> => {
      const target = path.join(folder, entry.name)
      if (entry.isDirectory()) return walk(target, root)
      if (!entry.isFile()) return []
      const file = await stat(target)
      return [{ path: path.relative(root, target).replaceAll("\\", "/"), bytes: file.size }]
    }),
  )
  return nested.flat()
}

export async function collectStaticAssetMetrics(appRoot: string): Promise<StaticAssetMetrics> {
  const staticRoot = path.join(appRoot, ".next", "static")
  let files: Array<{ path: string; bytes: number }>
  try {
    files = await walk(staticRoot, staticRoot)
  } catch {
    return {
      available: false,
      totalBytes: 0,
      javascriptBytes: 0,
      cssBytes: 0,
      fileCount: 0,
    }
  }

  const assets = files.filter((file) => /\.(?:js|css)$/i.test(file.path))
  const largestAsset = [...assets].sort((a, b) => b.bytes - a.bytes)[0]
  return {
    available: true,
    totalBytes: assets.reduce((total, file) => total + file.bytes, 0),
    javascriptBytes: assets
      .filter((file) => /\.js$/i.test(file.path))
      .reduce((total, file) => total + file.bytes, 0),
    cssBytes: assets
      .filter((file) => /\.css$/i.test(file.path))
      .reduce((total, file) => total + file.bytes, 0),
    fileCount: assets.length,
    largestAsset,
  }
}
