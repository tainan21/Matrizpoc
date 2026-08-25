import { unlockAction } from "../actions"

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return <main className="unlock-page"><section className="unlock-card"><div className="unlock-brand"><b>M</b><span>MATRIZ / CONTROL</span></div><p className="section-label">ACESSO / LOCAL</p><h1>Entre no cockpit.</h1><p>Use o valor de <code>MATRIZ_CONTROL_LOCAL_TOKEN</code>. A sessão fica somente neste navegador.</p><form action={unlockAction}><label>Token local<input name="token" type="password" minLength={16} autoComplete="current-password" required autoFocus /></label>{error ? <p className="unlock-error" role="alert">{error === "configuration" ? "Configure um token local com pelo menos 16 caracteres." : "Token inválido."}</p> : null}<button type="submit">Desbloquear Control</button></form><small>HTTP-only · SameSite Strict · loopback</small></section></main>
}
