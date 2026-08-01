import { unlockAction } from "../actions"
import {
  isLocalTestAccessEnabled,
  LOCAL_TEST_TOKEN,
} from "../../src/auth/local-access"

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const localTestAccessEnabled = isLocalTestAccessEnabled()
  return (
    <main className="unlock-page">
      <section className="unlock-panel" aria-labelledby="unlock-title">
        <div className="brand-mark" aria-hidden="true">M</div>
        <p className="eyebrow">Matriz local workspace</p>
        <h1 id="unlock-title">Desbloquear Workbench</h1>
        <p className="muted">
          {localTestAccessEnabled ? (
            <>
              Para teste local, use <code>{LOCAL_TEST_TOKEN}</code>. O acesso de produção
              continua exigindo <code>WORKBENCH_LOCAL_TOKEN</code>.
            </>
          ) : (
            <>
              Use o valor de <code>WORKBENCH_LOCAL_TOKEN</code>.
            </>
          )}{" "}
          O token vira uma sessão HTTP-only e não é armazenado no navegador.
        </p>
        <form action={unlockAction} className="stack">
          <input
            className="sr-only"
            name="username"
            type="text"
            autoComplete="username"
            value="local"
            readOnly
            tabIndex={-1}
          />
          <label>
            Token local
            <input
              name="token"
              type="password"
              autoComplete="current-password"
              minLength={localTestAccessEnabled ? LOCAL_TEST_TOKEN.length : 16}
              required
              autoFocus
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error === "rate-limited"
                ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
                : "Token inválido."}
            </p>
          ) : null}
          <button className="button primary" type="submit">Entrar no workspace</button>
        </form>
        <p className="security-note">Restrito a 127.0.0.1 · sem banco · sem cloud</p>
      </section>
    </main>
  )
}
