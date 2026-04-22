"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, type OtpStartOutput } from "@matriz/platform-auth/client"
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  Stack,
  Text,
} from "@matriz/design-ui"
import { spotLoginCopy } from "../../../auth/config"

type Phase = "email" | "code" | "signed-in"

export function SpotLoginScreen() {
  const router = useRouter()
  const { status, error, start, verify, signOut, defaultStrategyId, strategies, session } =
    useAuth()
  const strategyId = defaultStrategyId
  const strategyLabel =
    strategies.find((s) => s.id === strategyId)?.label ?? "OTP"

  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [hint, setHint] = React.useState<string | null>(null)
  const [phase, setPhase] = React.useState<Phase>(() =>
    session ? "signed-in" : "email",
  )

  React.useEffect(() => {
    if (session) setPhase("signed-in")
  }, [session])

  const submitting = status === "signing-in"

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    const out = await start<{ email: string }, OtpStartOutput>(strategyId, { email })
    if (out) {
      setHint(out.hint)
      setPhase("code")
    }
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    const sess = await verify(strategyId, { email, code })
    if (sess) {
      router.replace("/")
    }
  }

  if (phase === "signed-in" && session) {
    return (
      <Card>
        <CardHeader>
          <Badge tone="brand">Spot</Badge>
          <CardTitle>Voce ja esta autenticado</CardTitle>
          <CardDescription>
            {`Sessao ativa para ${session.identity.user.email}.`}
          </CardDescription>
        </CardHeader>
        <Stack gap={3}>
          <Button onClick={() => router.replace("/")}>Abrir Spot</Button>
          <Button variant="secondary" onClick={signOut}>
            Sair
          </Button>
        </Stack>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge tone="brand">Spot</Badge>
          <Text size="xs" tone="muted">{`estrategia: ${strategyId}`}</Text>
        </div>
        <Heading level={2}>{spotLoginCopy.headline}</Heading>
        <CardDescription>
          {phase === "email"
            ? spotLoginCopy.tagline
            : "Verifique a caixa de entrada e informe o codigo."}
        </CardDescription>
      </CardHeader>

      {error ? (
        <Alert tone="danger" title="Nao foi possivel prosseguir" className="mb-3">
          {error.message}
        </Alert>
      ) : null}

      {hint && phase === "code" ? (
        <Alert tone="info" title="POC mode" className="mb-3">
          {hint}
        </Alert>
      ) : null}

      {phase === "email" ? (
        <form onSubmit={onSubmitEmail}>
          <Stack gap={3}>
            <input
              aria-label="E-mail"
              className="h-11 rounded-md border border-border bg-surface px-3 text-surface-fg placeholder:text-muted-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              type="email"
              required
              placeholder={spotLoginCopy.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={submitting || !email}>
              {submitting ? "Enviando…" : `${spotLoginCopy.primaryCta} via ${strategyLabel}`}
            </Button>
          </Stack>
        </form>
      ) : (
        <form onSubmit={onSubmitCode}>
          <Stack gap={3}>
            <input
              aria-label="Codigo de 6 digitos"
              className="h-14 rounded-md border-2 border-border bg-surface px-3 text-center text-3xl font-mono tracking-[0.5em] text-surface-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              type="text"
              required
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <Button type="submit" disabled={submitting || code.length < 6}>
              {submitting ? "Validando…" : "Entrar"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPhase("email")
                setCode("")
                setHint(null)
              }}
            >
              Trocar e-mail
            </Button>
          </Stack>
        </form>
      )}

      <Stack gap={1} className="mt-4 border-t border-border pt-3">
        <Text size="xs" tone="muted">
          {`status: ${status}`}
        </Text>
      </Stack>
    </Card>
  )
}
