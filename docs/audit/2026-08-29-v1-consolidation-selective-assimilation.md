# Auditoria seletiva — `v1-consolidation`

Data da auditoria: 2026-08-29

## Veredito

**Não assimilar diretamente.** Nenhum delta de produto da
`codex/v1-consolidation-2026-08-27` foi migrado para esta worktree. A `main`
permanece a baseline arquitetural e funcional.

## Evidência imutável analisada

| Item | Valor |
| --- | --- |
| Base da auditoria | `main` em `05397f042c6ee927b5137335092af5b31aedbf02` |
| Worktree de evidência | `C:/Apps/matriz-infra-hub/.worktrees/v1-consolidation-2026-08-27` |
| HEAD da v1 | `61398bcbde4ebafe8f5c975c858038721faa399d` |
| Arquivos staged na v1 | 1.496 |
| Hash da diff staged binária | `f6b4d21b64df17e90e6d50099ca9b5a05e7160c5` |

A fonte desta auditoria é o **índice staged** da v1, não apenas os arquivos
visíveis na worktree. Não foram executados `checkout`, `reset`, `stash`,
`commit`, limpeza ou qualquer outra mutação na v1.

Para reproduzir a coleta:

```powershell
$v1 = 'C:/Apps/matriz-infra-hub/.worktrees/v1-consolidation-2026-08-27'
git -C $v1 status --short
git -C $v1 diff --cached --name-status main
git -C $v1 diff --cached --binary | git hash-object --stdin
```

Contra a `main`, a árvore staged da v1 contém 19 adições, 395 remoções,
163 modificações e 1 rename. As adições exclusivas não introduzem uma
capacidade de produto verificável: são capturas de auditoria ou material de
design sem um relatório canônico correspondente.

## Matriz de disposição

| Área da v1 | Disposição | Motivo |
| --- | --- | --- |
| Remoções de apps e manifests | Não migrar | A v1 removeria `matriz-ops`, `matriz-pay` e `matriz-uninstall`, que a `main` registra como apps formais. |
| Root, CI, lockfile, TypeScript e tooling | Não migrar | São superfícies globais; a v1 não oferece uma mudança isolada com validação proporcional. |
| Packages, contratos, eventos e Prisma | Não migrar | Não há migração app-local demonstrada; qualquer port exigiria revisão serial de boundaries, consumidores e schemas. |
| Autenticação, OIDC e autorização | Não migrar | A v1 reduz mecanismos de broker, BFF e testes de identidade/multitenancy presentes na `main`. |
| Rotas Hub/MatrizDocs | Não migrar | A v1 remove aguardas do contexto de ator em rotas que exigem contexto autenticado. |
| Matriz Control, Git e Store | Não migrar | A v1 remove proteções de origem, sanitização de ambiente e capacidades Store já presentes na `main`. |
| Runtime desktop | Não migrar | A v1 remove o catálogo de `matriz-uninstall` e não constitui uma avaliação Tauri/Electron compatível com a política vigente. |
| Testes e smoke tests | Não migrar | A v1 remove cobertura de segurança, identidade, distribuição, telemetria e isolamento tenant. |
| 17 screenshots de auditoria | Não migrar | Não há relatório Markdown exclusivo que lhes dê contexto, escopo e validade atual. |

## Regressões observadas

### Cobertura e capacidades removidas

A diff staged removeria 116 arquivos de `apps/matriz-ops`, 39 de
`apps/matriz-pay` e 97 de `apps/matriz-uninstall`. Também removeria testes de
OIDC, MFA, sessão, tenant isolation, distribuição, telemetria persistente e
as smoke tests correspondentes.

### Autorização e contexto de ator

Em `packages/platform/auth/src/v1/provider/AuthProvider.tsx`, a v1 troca a
mudança de tenant mediada pelo broker por uma mutação local da sessão. Isso
contorna o fluxo de autoridade existente.

Em rotas de MatrizDocs, incluindo
`apps/matriz-hub/app/api/docs/documents/[docId]/route.ts`, a v1 substitui
`await getDocsActorContextFromRequest(request)` por uma chamada sem `await`.
O contexto autenticado não pode ser reduzido a uma Promise repassada ao
repositório.

### Matriz Control

A v1 remove `assertSameOrigin` da rota Git, reduz o ambiente do subprocesso
Git de uma allowlist para `...process.env`, remove suporte explícito a caminhos
Windows na limpeza do Doctor e deixa de anunciar `matriz-uninstall` no catálogo
nativo da Store. Essas mudanças enfraquecem a contenção local documentada pelo
Matriz Control e não são candidatas a port.

## Regra para reavaliação futura

Um comportamento visto na v1 só poderá voltar à pauta se houver um commit ou
proposta isolada que:

1. descreva a necessidade de produto atual e o owner app-local;
2. preserve contratos, autoridade server-side e limites de runtime atuais;
3. introduza ou mantenha testes focados para o comportamento;
4. passe a validação proporcional definida em `docs/CHANGE-SAFETY.md`;
5. seja implementado como mudança nova, sem merge ou cherry-pick da árvore
   histórica.

## Resultado da assimilação

Não há alteração de código, interface pública, manifest, package, schema,
migration, contrato ou evento neste branch. O resultado é **zero deltas de
produto migrados** e uma decisão reproduzível de preservar a v1 somente como
evidência histórica.
