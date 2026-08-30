# Matriz Local Infrastructure V1 — Plano Principal

## Execução

Trabalho sequencial na branch `codex/matriz-local-infrastructure-v1`, preservando
mudanças anteriores. Staging e commits usam paths explícitos; nenhum segredo,
dump, log, build output ou cache entra no Git.

1. Contracts/governança: contrato técnico, 16 declarações, Control read-only,
   CI, leis, ownership/access/threat model e topologia de oito schemas.
2. Serviços/cockpit: bridge desktop, catálogo de runtimes, SCM, estados e UI.
3. PostgreSQL/dados: provisioning, roles, RLS, drift, migrations, backup,
   restore, recreate e seed.
4. Identity/secrets/cache: OIDC local, vault, export explícito e Garnet.
5. Eventos: NATS JetStream, outbox/inbox, workers, DLQ e pruning.
6. Aceite integrado: checks globais, Playwright, NSIS, Windows limpo e SHA-256.

## Gates

Cada fase precisa de testes focados, lint/typecheck aplicável, boundary check,
diff review e evidências sem secrets. Uma fase não torna a próxima
implicitamente entregue. Falha de contrato, drift, migration pendente ou role
insegura bloqueia launch gerenciado.

## Estado

- Plano 1: gate implementado e verificado localmente.
- Plano 2: próximo gate.
- Planos 3–5 e aceite: pendentes dos gates anteriores.

Consulte os cinco documentos sequenciais homônimos para tarefas e critérios de
saída.
