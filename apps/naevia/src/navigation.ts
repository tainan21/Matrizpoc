export function navigationTarget(input: string): string {
  const value = input.trim()
  if (!value || value.length > 2_048) throw new Error("Digite uma URL ou busca válida")
  const candidate = /^[a-z]+:\/\//i.test(value)
    ? value
    : /^(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(value)
      ? `http://${value}`
      : value.includes(".") && !/\s/.test(value)
        ? `https://${value}`
        : `https://duckduckgo.com/?q=${encodeURIComponent(value)}`
  const url = new URL(candidate)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Somente navegação HTTP(S) é permitida")
  url.username = ""
  url.password = ""
  return url.toString()
}
