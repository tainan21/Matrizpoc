# Matriz Uninstall — Design

## Objetivo

Entregar um gerenciador Windows para instalar, atualizar, reinstalar e
desinstalar produtos Matriz. Tauri é a edição principal; Electron mantém
paridade como edição de compatibilidade e benchmark para casos específicos.
O catálogo é administrado pelo Matriz Admin.

## Arquitetura

`apps/matriz-uninstall` é o único owner do comportamento local. Domínio,
aplicação, presenters e renderer são compartilhados; `desktop/tauri` e
`desktop/electron` implementam o mesmo gateway nativo. Nenhum shell importa
internals de outro app.

Tauri é o runtime recomendado para instalação normal. A edição Electron não é
eliminada, mas não define o padrão arquitetural de novos produtos desktop.

O Hub é owner do catálogo global de distribuição e oferece contratos HTTP v1.
O Admin altera esse catálogo por um gateway autenticado. Releases publicadas
carregam manifesto, assinatura, SHA-256 e identidade Windows; o Uninstall não
aceita comandos ou caminhos remotos.

## Segurança

A assinatura V1 usa Ed25519 sobre os campos UTF-8 unidos por `LF`, nesta ordem exata: `productId`, `version`, `downloadUrl`, `sizeBytes` decimal e `sha256` minúsculo. As duas edições recebem a chave pública bruta de 32 bytes, em Base64, por `MATRIZ_DISTRIBUTION_PUBLIC_KEY`. O pipeline fornece essa chave como secret; ela nunca é versionada.

- Catálogo `stable`: HTTPS, manifesto assinado, tamanho e SHA-256 exatos e
  Authenticode do publisher esperado.
- Catálogo `local-development`: somente em build de desenvolvimento, arquivo
  escolhido localmente e confirmação explícita de artefato não assinado.
- Desinstalação: executável e argumentos derivados de uma chave de registro
  allowlisted e executados sem shell.
- Limpeza V1: somente cache, logs e temporários app-local allowlisted. Dados,
  configurações, documentos e workspaces permanecem preservados.
- Auto-remoção: o app inicia seu desinstalador registrado e encerra.

## Produtos iniciais

Control Tauri, Control Electron, Admin Tauri, Ops Tauri, Seumei Electron,
Workbench Electron, Pay sem release Windows e as duas edições do Uninstall.
As instalações históricas dos dois Control permanecem intactas e são exibidas
separadamente por aliases de registro.

## Aceitação

As duas edições devem produzir os mesmos ViewModels e resultados para todos os
fluxos. Uma suíte Windows descartável mede paridade, tamanho, inicialização,
RAM, CPU, tempos operacionais e resíduos. Nenhum teste destrutivo roda contra a
máquina do usuário sem ação explícita.
