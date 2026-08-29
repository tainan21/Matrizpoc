export function withReadDeadline<T>(read: Promise<T>, milliseconds: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Local read timed out")), milliseconds) })
  return Promise.race([read, deadline]).finally(() => { if (timeout) clearTimeout(timeout) })
}
