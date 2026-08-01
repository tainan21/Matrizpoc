# ADR — Fronteira de adoção da Matriz Lib UI

## Decisão

Manter a Matriz Lib UI como repositório federado e read-only nesta fase.
Inspecionar contratos de package pelo Workbench, sem link de filesystem.

Quando houver artefato portátil, permitir somente imports por subpath de uma
allowlist revisada. `@matriz/product-ui` não é fundação compartilhada.

## Motivo

O modelo preserva independência de release, impede caminhos locais
versionados e evita que Billing, Wallet ou Orders entrem no Hub como domínio
compartilhado. A inspeção de metadados é suficiente para planejar a adoção sem
carregar código ou aumentar o bundle.

## Impacto

- o Workbench projeta nome, versão, exports, dependências, peers e nomes de
  scripts de packages registrados;
- código-fonte, caminhos locais e comandos de scripts não são retornados;
- não há dependência nova no Infra Hub;
- a primeira integração visual fica bloqueada até existir distribuição
  portátil e evidência de qualidade.

## Revisar quando

- a biblioteca publicar uma versão consumível;
- `@matriz/blocks` tiver testes e stories verificáveis;
- duas aplicações precisarem da mesma superfície;
- `product-ui` separar composição genérica de domínio de produto.

