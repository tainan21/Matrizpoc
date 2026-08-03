import { unlockAction } from "../actions"
import {
  isLocalTestAccessEnabled,
  LOCAL_TEST_TOKEN,
} from "../../src/auth/local-access"
import { UnlockAppearanceToggle } from "../../src/ui/components/unlock-appearance-toggle"

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const localTestAccessEnabled = isLocalTestAccessEnabled()

  return (
    <main className="unlock-page">
      <section className="unlock-showcase" aria-label="Matriz Workbench">
        <div className="unlock-showcase-head">
          <div className="unlock-brand">
            <div className="brand-mark" aria-hidden="true">M</div>
            <span>
              <strong>Matriz</strong>
              <small>Workbench</small>
            </span>
          </div>
          <span className="unlock-version">Local-first / 01</span>
        </div>

        <div className="unlock-statement">
          <p className="eyebrow">Seu trabalho, com contexto</p>
          <h2>Uma base calma para ideias em movimento.</h2>
          <p>
            Planeje, decida e trabalhe com o Codex sem perder a memória do projeto.
          </p>
        </div>

        <div className="design-system-preview" aria-label="Matriz Design System">
          <div className="design-system-heading">
            <span>Matriz Design System</span>
            <span>Light + Dark</span>
          </div>
          <div className="design-system-specimen">
            <div className="design-system-type" aria-hidden="true">
              <strong>Aa</strong>
              <span>Geist<br />Geist Mono</span>
            </div>
            <div className="design-system-palette" aria-label="Cores semânticas">
              <i className="accent" title="Accent" />
              <i className="success" title="Success" />
              <i className="warning" title="Warning" />
              <i className="neutral" title="Neutral" />
            </div>
          </div>
          <div className="design-system-rules" aria-hidden="true">
            <span>Tipografia</span><span>Cor semântica</span><span>Ritmo 4px</span>
          </div>
        </div>
      </section>

      <section className="unlock-access" aria-labelledby="unlock-title">
        <div className="unlock-access-head">
          <span className="unlock-access-status"><i /> Ambiente local</span>
          <UnlockAppearanceToggle />
        </div>

        <div className="unlock-panel">
          <p className="eyebrow">Acesso protegido</p>
          <h1 id="unlock-title">Entre no seu workspace.</h1>
          <p className="unlock-description">
            {localTestAccessEnabled ? (
              <>
                Para teste local, use <code>{LOCAL_TEST_TOKEN}</code>. Em produção,
                use <code>WORKBENCH_LOCAL_TOKEN</code>.
              </>
            ) : (
              <>
                Use o valor de <code>WORKBENCH_LOCAL_TOKEN</code> para continuar.
              </>
            )}
          </p>
          <form action={unlockAction} className="stack unlock-form">
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
                placeholder="Digite seu token"
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
            <button className="button primary" type="submit">
              <span>Entrar no workspace</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="security-note">
            <span aria-hidden="true">●</span> Sessão HTTP-only · restrita a 127.0.0.1
          </p>
        </div>

        <p className="unlock-footer">Sem banco. Sem cloud. Seus arquivos permanecem locais.</p>
      </section>
    </main>
  )
}
