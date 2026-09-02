export const MAX_DOWNLOAD_BYTES = 536_870_912

export function safeDownloadName(value: string) {
  const leaf = value.split(/[\\/]/).at(-1)?.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "") ?? ""
  if (!leaf || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(leaf)) return "download.bin"
  return leaf.slice(0, 120)
}

export function validDownloadUrl(value: string) {
  try { return ["http:", "https:"].includes(new URL(value).protocol) } catch { return false }
}
