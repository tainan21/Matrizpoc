# Segurança de mudanças

> Estas regras reduzem blast radius. Elas não substituem as leis em
> `architectural-laws.md`; alterações de root, contratos, migrations e leis
> recebem revisão serial, nunca são agrupadas com refactors oportunistas.

## Superfícies de alto impacto

Trate como mudança de alcance global: configuração raiz (`package.json`, lock,
`tsconfig*.json`, `eslint.config.*`, `vitest.config.*`), `tooling/`,
`turbo.json`, `pnpm-workspace.yaml`, schemas e migrations Prisma,
`packages/integration/api-contracts`, `packages/integration/events`, manifests
e `docs/architectural-laws.md`. Alterações em `docs/app-communication.md`,
`docs/monorepo-structure.md` e neste documento também exigem revisão serial
porque definem as fronteiras que os checks automatizados auditam.

Não altere config raiz, tooling, contratos, migrations ou leis para resolver
um problema exclusivamente app-local sem justificar o impacto e a alternativa
de menor escopo.

## Validação proporcional

| Área tocada | Validação mínima além da revisão do diff |
| --- | --- |
| App isolado | checks do app afetado (`pnpm --filter <app> lint` e `typecheck`) e teste focado existente |
| Package compartilhado ou manifest | checks dos consumidores afetados, `pnpm test:smoke` e `pnpm tsx tooling/scripts/verify-app-boundaries.ts` |
| Contratos ou eventos | `pnpm test:smoke`, boundary check, compatibilidade de produtor/consumidor e plano de versão/depreciação |
| Prisma schema ou migration | `pnpm prisma:validate`, geração e consistência dos oito clients, teste de migration/rollback aplicável, validação de tenant/RLS/roles, smoke dos apps afetados e worktree limpo após a geração |
| Root, workspace, lock, tsconfig ou tooling | `pnpm lint`, `pnpm typecheck`, `pnpm test:smoke`, `pnpm tsx tooling/scripts/verify-app-boundaries.ts`, e geração/consistência dos seis clients se Prisma ou seus scripts forem afetados |
| Leis ou outros docs de governança | paths/links citados, coerência entre os documentos canônicos e `git diff --check` |

Execute somente checks existentes e relevantes; não invente testes de prose.
Depois de qualquer generator, Prisma generate ou ferramenta que escreva no
worktree, revise `git status --short`. Artefato inesperado deve ser explicado e
removido de forma segura antes da entrega, sem apagar mudanças alheias.

### Consistência de clients Prisma

Ao tocar um schema Prisma, migration, client ou script raiz relacionado, valide
os oito schemas e gere/inspecione os clients de `core`, `hub`, `spot`, `seumei`,
`contracts`, `willdash`, `ops` e `pay`. A geração deve corresponder ao schema tocado e o
worktree deve ser revisado depois; nenhum client gerado pode ficar omitido por
estar fora do script agregado.

O script agregado `pnpm prisma:generate` cobre `core`, `hub`, `spot`, `seumei`,
`contracts`, `willdash`, `ops` e `pay`, usando as fontes em
`prisma/<schema>/schema.prisma`. Sempre confira o estado do worktree depois da
geração e investigue qualquer saída inesperada.

## Ambiente e dados sensíveis

- Somente `.env.example`, schema de variáveis e documentação podem ser
  commitados.
- Nunca commitar `.env`, `.env.*` real, tokens, chaves, cookies, credenciais,
  dumps, logs ou conteúdo sensível. Uma exceção só existe se for um exemplo
  explicitamente sem segredo.
- Documente nome, finalidade, owner e se é obrigatório; segredos ficam no
  provedor de ambiente apropriado, nunca em issue, snapshot ou output de teste.
- Apps devem falhar de forma explícita quando um segredo obrigatório estiver
  ausente, sem substituir o segredo por valor de produção implícito.

Também são proibidos no Git: `node_modules`, `.next`, `.turbo`, artefatos de
build/cache/runtime, cobertura gerada, screenshots temporários e logs.

## Instaladores e Store nativa

- O renderer envia somente `appId` e ações tipadas; URLs, paths, comandos,
  publishers e argumentos de instalador pertencem ao catálogo nativo confiável.
- Manifest de distribuição remoto exige assinatura verificável, HTTPS,
  tamanho limitado e SHA-256; o executável exige Authenticode e publisher
  aprovado antes de ser iniciado.
- Ausência de canal, chave pública, certificado, publisher ou origem HTTPS
  obrigatória produz estado `unavailable`; nunca habilita bypass de produção.
- Instalação e desinstalação usam o mecanismo registrado do Windows. O Control
  não remove diretamente dados do app nem diretórios de usuário.
- Instaladores, blockmaps, manifests gerados, assinaturas e caches de download
  são artefatos de release e não entram no Git.

## Proposta de package novo

Antes de criar `packages/<grupo>/<pacote>`, registre na proposta:

```text
Nome e owner:
Dois ou mais consumidores reais:
Responsabilidade domain-free:
Imports permitidos:
Imports proibidos:
API pública estável e versionamento:
Alternativa app-local considerada:
Redução mensurável de manutenção:
Validação e plano de adoção/rollback:
```

Package não recebe entity, repository ou regra forte de um produto. Sem dois
consumidores reais, superfície estável e ganho mensurável, a implementação fica
no app dono.

## Checklist antes de revisão

1. Delimite os apps, packages, schemas e contratos afetados.
2. Verifique que não há import de `apps/<outro-app>/src/**` ou `app/**`.
3. Rode os checks proporcionais acima e registre resultados/falhas conhecidas.
4. Confirme `git diff --check` e `git status --short`, inclusive após geradores.
5. Para root, contrato, migration ou lei, obtenha revisão serial com owner da
   fronteira antes de mesclar.
