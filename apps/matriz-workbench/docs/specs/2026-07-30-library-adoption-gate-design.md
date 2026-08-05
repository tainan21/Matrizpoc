# Library Adoption Gate — Design

Status: aprovado conceitualmente em 2026-07-30.  
Escopo: `apps/matriz-workbench` e dados portáteis da raiz `.matriz/**`.

## Objetivo

Permitir que uma pessoa e o Codex decidam se um package de um repositório
federado pode ser adotado, usando evidências verificáveis e sem copiar código,
instalar caminhos locais ou expor filesystem genérico.

O primeiro caso é a Matriz Lib UI. O canal oficial futuro será GitHub Packages
privado, com releases coordenadas. Tarballs locais continuarão sendo usados
somente por smoke tests de distribuição.

## Fora do escopo

- publicar packages nesta entrega;
- alterar `C:\Apps\MatrizLibUiOficial`;
- instalar packages externos no Infra Hub;
- armazenar credenciais do GitHub;
- executar build, pack, publish ou shell pela interface;
- aprovar automaticamente um package;
- tornar `@matriz/product-ui` uma fundação compartilhada.

## Alternativas avaliadas

### GitHub Packages privado — selecionada

Mantém os repositórios federados, entrega versões reproduzíveis e permite
controle de acesso. A instalação precisa de credencial, mas o runtime do
Workbench continua offline e sem cloud.

### Tarballs de GitHub Release

São úteis como artefato de diagnóstico, porém ficam difíceis de coordenar
quando um package depende de vários `@matriz/*`. Não serão o canal oficial.

### Vendoring, submodule ou workspace local

Foram rejeitados por duplicar ownership, acoplar checkouts e comprometer clean
clone, atualização e reversão.

## Arquitetura

### Política portátil

Arquivo:

```text
.matriz/adoption-policies/matriz-lib-ui.json
```

O arquivo declara somente regras portáteis:

```ts
interface LibraryAdoptionPolicy {
  schemaVersion: 1
  sourceId: string
  distribution: {
    channel: "github_packages"
    registry: "https://npm.pkg.github.com"
    coordinatedReleases: true
  }
  packages: PackageAdoptionRule[]
}

interface PackageAdoptionRule {
  name: string
  status: "blocked" | "candidate" | "approved"
  allowedSubpaths: string[]
  requiredChecks: string[]
  blockers: string[]
  evidence: string[]
}
```

Nenhum token, caminho absoluto ou comando será armazenado nesse arquivo.

### Camadas

- `src/domain/library-adoption.ts`: schemas e estados válidos;
- `src/integration/filesystem/library-adoption-policy-repository.ts`: leitura
  bounded do arquivo portátil;
- `src/application/library-adoption-readiness.ts`: combina política e contrato
  read-only do package;
- `app/(workspace)/knowledge/[sourceId]/page.tsx`: apresenta o gate;
- `src/mcp/server.ts`: publica uma leitura específica.

O repositório federado continua responsável apenas por inspecionar a fonte
externa. A política do ecossistema não será misturada ao adapter externo.

## Avaliação de prontidão

O resultado será determinístico:

```ts
interface PackageAdoptionReadiness {
  sourceId: string
  packageName: string
  status: "blocked" | "candidate" | "approved"
  ready: boolean
  satisfied: string[]
  missing: string[]
  allowedSubpaths: string[]
  evidence: string[]
}
```

`ready` somente será verdadeiro quando:

1. o package existir na fonte registrada;
2. todos os subpaths permitidos estiverem no mapa de exports;
3. os checks exigidos estiverem declarados;
4. não houver blocker aberto;
5. a regra estiver explicitamente em `approved`;
6. as evidências referenciadas existirem dentro do repositório autorizado.

O Workbench não executará os checks. Ele registra e apresenta evidências
produzidas pelo pipeline proprietário.

## Política inicial

| Package | Estado inicial | Próximo gate |
|---|---|---|
| `@matriz/tokens` | candidate | testes, release e canary |
| `@matriz/themes` | blocked | validar bootstrap, flash e transição |
| `@matriz/primitives` | candidate | testes, a11y e canary |
| `@matriz/ui` | candidate | reduzir barrel e validar composição |
| `@matriz/blocks` | candidate | subpaths apenas; primeiro `page-header` |
| `@matriz/product-ui` | blocked | separar domínio e showcase |

Nenhum package começa como `approved`.

## MCP

Nova leitura:

```text
workbench_get_package_adoption_readiness
```

Entrada:

```json
{
  "sourceId": "matriz-lib-ui",
  "packageName": "@matriz/tokens"
}
```

O retorno não inclui código, paths locais, conteúdo de scripts ou credenciais.
Não será adicionada ferramenta de escrita nesta etapa.

## Interface

Na página existente de Conhecimento:

- estado do package;
- requisitos satisfeitos e ausentes;
- subpaths permitidos;
- blockers;
- evidências;
- próxima ação operacional.

O componente reutiliza o layout denso existente. Não haverá dashboard, wizard
ou nova navegação.

## Fluxo futuro de publicação

As mudanças abaixo pertencem ao repositório Matriz Lib UI e ocorrerão em uma
tarefa separada:

1. adicionar Changesets;
2. definir `publishConfig` para GitHub Packages;
3. usar versões coordenadas;
4. publicar canary;
5. instalar os tarballs em consumer externo;
6. executar lint, types, build, audits e testes de acessibilidade;
7. anexar evidências;
8. promover a regra no Workbench após revisão humana.

Ordem de consumo:

1. `@matriz/tokens/css`;
2. primitives por subpath;
3. UI por subpath;
4. `@matriz/blocks/page-header`;
5. themes após hardening;
6. `product-ui` não será fundação.

## Segurança e erros

- arquivo de política limitado a 256 KB;
- source IDs e package names validados;
- evidências aceitam somente caminhos relativos seguros;
- política ausente retorna `not_configured`, sem quebrar o catálogo;
- package ausente retorna `NOT_FOUND`;
- política inválida retorna `INVALID_DATA`;
- nenhuma leitura segue symlink para fora do repositório;
- nenhum segredo do registry é armazenado ou retornado.

## Testes

### Unitários

- schema rejeita registry, status, paths ou subpaths inválidos;
- evaluator diferencia `blocked`, `candidate` e `approved`;
- exports/checks ausentes aparecem em `missing`;
- `ready` não pode ser verdadeiro com blockers.

### Integração

- política é lida somente da raiz registrada;
- traversal e symlink são rejeitados;
- fonte sem política permanece navegável;
- MCP retorna projeção compacta;
- nenhum path absoluto aparece no retorno.

### Gates

- testes do incremento;
- lint;
- typecheck;
- build;
- MCP contract check;
- app boundaries;
- inspeção visual light/dark e mobile.

## Score 0–100

Pontos somente serão propostos após:

- schema e repositório testados;
- interface observável;
- MCP verificado;
- documentação e screenshot existentes.

A decisão, por si só, não concede ponto.

## Reversão

Remover a política e a projeção do Workbench restaura o comportamento anterior.
Nenhum domínio, package ou lockfile externo será afetado.

