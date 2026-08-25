# Estrutura do monorepo

> Mapa canônico de ownership e promoção. Este documento separa o que existe no
> repositório do alvo aprovado pelo programa Matriz.

## Estado atual

```text
Matriz/
├─ apps/
│  ├─ matriz-hub/        # control plane e MatrizDocs
│  ├─ matriz-identity/   # OIDC e identidade central
│  ├─ matriz-workbench/  # local-first, .matriz/** e Git
│  ├─ matriz-control/    # cockpit operacional web
│  ├─ matriz-desktop/    # cockpit nativo Tauri/Windows
│  ├─ matriz-admin/      # administração operacional
│  ├─ matrizlib/         # design system e playground
│  ├─ spot/              # bandas, artistas, gigs e bookings
│  ├─ seumeiapp/         # produto Seumei assimilado
│  ├─ contracts/         # contratos, partes, versões e histórico
│  ├─ willdash/          # metas, recompensas e atividade
│  └─ sites/             # sites orientados por arquivos/configuração
├─ packages/
│  ├─ design/
│  ├─ platform/
│  ├─ access/
│  ├─ integration/
│  ├─ flows/
│  └─ foundation/
├─ prisma/<schema>/
│  ├─ schema.prisma
│  └─ migrations/**
├─ tests/smoke/
├─ tooling/
├─ docs/
├─ i18n/
└─ emails/
```

Os seis arquivos Prisma são fontes presentes no repositório; eles não provam
que Neon, migrations por schema, roles de runtime ou RLS já estejam
implantados. Essas entregas pertencem à Onda 2.

### Apps e ownership

| App | Estado | Ownership de dados |
| --- | --- | --- |
| `matriz-hub` | atual | control plane/MatrizDocs; fonte Prisma `hub` |
| `matriz-workbench` | atual | `.matriz/**` e Git; sem PostgreSQL na V1 |
| `spot` | atual | domínio Spot; fonte Prisma `spot` |
| `seumeiapp` | atual | domínio Seumei; fonte Prisma `seumei` |
| `contracts` | atual | domínio Contracts; fonte Prisma `contracts` |
| `willdash` | atual | domínio WillDash; fonte Prisma `willdash` |
| `sites` | atual | catálogo, conteúdo e configuração em arquivos; sem PostgreSQL na V1 |
| `matriz-identity` | atual | OIDC e identidade central em `core` |
| `matriz-control` | atual | supervisão local de processos e terminal |
| `matriz-desktop` | atual | autoridade nativa Windows app-local |
| `matriz-admin` | atual | administração e operação local |
| `matrizlib` | atual | catálogo visual e design system |

O schema `core` é a fronteira planejada para identidade e serviços Core
centrais/compartilhados, incluindo o serviço tenant-aware de ExternalLinks.
Os registros operacionais desse serviço são tenant-owned e não ampliam a
whitelist global fechada. O Core não autoriza repositories de produto em package
central.

## Alvo aprovado de persistência — Onda 2

Uma única instância física PostgreSQL no Neon conterá seis schemas lógicos:
`core`, `hub`, `spot`, `seumei`, `contracts` e `willdash`. Cada app com banco é
dono de schema, migrations e role de runtime. Workbench continua
`.matriz/**`/Git-backed e Sites continua file/config-backed.

O package `packages/platform/db` existe hoje e ainda expõe clients e
repositories específicos de Core, Hub, Seumei e Contracts. Essa é dívida de
boundary, não o desenho aprovado.

No alvo, `platform-db` é exclusivamente técnico:

- ciclo de vida seguro de clients e conexões;
- primitivas neutras de transação e contexto;
- instrumentação e helpers sem semântica de produto.

Repositories como `EstablishmentRepository`, `ContractRepository` e
repositories de MatrizDocs/Hub pertencem ao app dono. Em particular,
`platform-db` não pode conter repositories de Seumei ou Contracts. A correção é
incremental na Onda 2; este documento não afirma que a realocação já ocorreu.

## Estrutura interna app-local — alvo aprovado

Novas capacidades nascem dentro do app em `src/modules/<capability>`. Apps que
ainda usam estruturas horizontais migram somente quando a capacidade for
tocada; não há reescrita cosmética em massa.

Estrutura de referência:

```text
apps/<app>/src/modules/<capability>/
├─ domain/
├─ application/
├─ integration/
├─ presentation/
├─ ports.ts              # ou ports/ quando houver mais de um contrato
├─ facade.ts
├─ public.ts             # única superfície consumível por outro módulo
└─ manifest.ts           # opcional, metadata local da capacidade
```

Regras:

1. `public.ts` expõe somente a facade, os ports e ViewModels/DTOs necessários.
2. A facade orquestra use cases; ela não expõe entities nem adapters concretos.
3. Ports pertencem ao módulo consumidor e adapters ficam em `integration/`.
4. Um manifest local é opcional e não substitui o manifest do app.
5. Módulos irmãos consomem apenas `public.ts`.
6. A composição de facades, adapters, handlers e manifests locais ocorre apenas
   em `src/bootstrap/index.ts` do app.
7. A UI continua consumindo presenters/ViewModels, nunca entities cruas.

Essa organização aumenta isolamento interno sem transformar cada capability em
package ou serviço antes da hora.

## Escada de promoção

### 1. App-local por padrão

Uma nova regra, tela, repository ou integração permanece no app que a possui.
Quando a complexidade justificar, vira módulo app-local com `public.ts`; isso
não muda deployment nem ownership de dados.

### 2. App independente somente com evidência

Uma capability é candidata a app/serviço independente quando houver necessidade
real e documentada de uma ou mais destas fronteiras:

- deployment independente;
- ownership/equipe independente;
- política de dados, retenção ou autorização própria;
- perfil de escala ou disponibilidade independente;
- contrato externo estável com ciclo de vida próprio.

A proposta deve definir owner, dados, API/eventos, migração, observabilidade e
rollback. Separação de pastas, preferência tecnológica ou possível reuso não
bastam.

### 3. Integração remota sem código remoto em runtime

Na V1, repositórios/apps remotos integram por contrato, manifest ou snapshot
assinado e verificável. O consumidor valida origem, versão e integridade antes
de materializar dados permitidos. É proibido baixar, importar ou executar código
remoto em runtime como plugin; a promoção não cria uma exceção a essa regra.

Workbench pode registrar repositórios federados sem executar seus internals e
Sites pode promover configuração validada. Nenhum deles transforma referência
remota em dependência de código dinâmica.

## Critérios para package compartilhado

Extração para `packages/*` só é aceita quando **todos** os critérios forem
verdadeiros:

1. dois ou mais apps reais já consomem a implementação;
2. a responsabilidade é técnica ou compartilhável, sem domínio forte de um
   produto;
3. a superfície pública é estável e pode ser versionada/testada;
4. a extração reduz custo mensurável de manutenção.

Caso contrário, a implementação permanece app-local. A proposta de package
segue o template de `docs/CHANGE-SAFETY.md`.

## Convenções preservadas

- Pastas e arquivos usam nomes em inglês.
- Cada app atual possui `docs/AGENT-START-HERE.md`, `README.md`,
  `public-contract.ts`, `src/manifest/manifest.ts` e
  `src/bootstrap/index.ts`.
- Outro app só pode ser lido por seu `public-contract.ts` quando permitido.
- Repositórios externos continuam federados; caminhos locais não são
  versionados.
- Mudanças de root, contratos, migrations e leis recebem revisão serial.
