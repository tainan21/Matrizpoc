export function redactProjectOutput(value: string): string {
  return value
    .replace(/\b(authorization\s*:\s*)(?:bearer\s+)?[^\s]+/gi, "$1[redacted]")
    .replace(/\b((?:token|secret|password|api[_-]?key)\s*[=:]\s*)[^\s]+/gi, "$1[redacted]")
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[redacted]@")
}
