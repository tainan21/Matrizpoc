# Matriz Uninstall — Design

## Objetivo

Entregar um gerenciador Windows para instalar, atualizar, reinstalar e
desinstalar produtos Matriz, com edições Tauri e Electron funcionalmente
equivalentes e um catálogo administrado pelo Matriz Admin.

## Arquitetura

`apps/matriz-uninstall` é o único owner do comportamento local. Domínio,
aplicação, presenters e renderer são compartilhados; `desktop/tauri` e
`desktop/electron` implementam o mesmo gateway nativo. Nenhum shell importa
internals de outro app.

O Hub é owner do catálogo global de distribuição e oferece contratos HTTP v1.
O Admin altera esse catálogo por um gateway autenticado. Releases publicadas
carregam manifesto, assinatura, SHA-256 e identidade Windows; o Uninstall não
aceita comandos ou caminhos remotos.

## Segurança

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

