# Matriz Desktop — design do primeiro aplicativo nativo

## Decisão

Criar `apps/matriz-desktop`, distribuído como **Matriz Control**, usando Tauri
2.11, Rust e uma UI React 19/Vite que consome apenas exports públicos da
MatrizLib. O primeiro alvo é Windows 11 x64 e o instalador oficial é NSIS por
usuário, sem elevação administrativa.

O app é uma ferramenta nativa de ação rápida, não uma versão empacotada do
Matriz-Hub web. O frontend é estático e local; não existe servidor HTTP em
produção. O backend Rust é a única camada com acesso a processos, sockets,
filesystem e integração Windows.

## Alternativas avaliadas

### Tauri 2 + Rust + React/Vite — escolhida

- reutiliza React, tokens, temas, componentes e sons públicos;
- usa o WebView2 mantido pelo Windows, reduzindo tamanho e memória;
- entrega binário e instalador Windows reais;
- capabilities limitam exatamente quais comandos a janela pode invocar;
- Rust e Win32 permitem enumerar portas e terminar processos sem shell;
- abre caminho para macOS/Linux por adapters, sem prometer suporte agora.

### Electron + React

Integra Node e processos com menos código nativo, mas mantém Chromium e Node
residentes para uma utility compacta. O custo de RAM, startup, distribuição e
superfície de segurança é desproporcional ao produto.

### .NET/WinUI 3

Ofereceria visual e APIs Windows excelentes, mas criaria uma segunda stack de
UI e impediria reaproveitamento direto da MatrizLib. É uma alternativa futura
para experiências estritamente Windows, não para a primeira fundação comum.

## Localização e limites

`apps/matriz-desktop` é um app do monorepo porque possui ciclo de produto,
scripts, testes, manifest e ownership próprios. Nenhum package compartilhado
novo será criado. Código Win32, catálogo operacional e preferências ficam
app-local até existir um segundo consumidor desktop.

O app poderá entrar no registry público como o nono app com base
`matriz://control`, mas o protocolo não será usado para executar comandos.
`public-contract.ts` continuará manifest-only. Nenhum internal de outro app é
importado.

## Produto v0.1

### P0

1. **Portas e processos** — lista TCP listening com porta, PID, processo e
   caminho resumido; busca, refresh, encerramento individual e encerramento em
   lote da seleção visível.
2. **Launcher Matriz** — inicia e encerra somente os oito scripts `dev`
   allowlisted do repositório; mantém handles dos filhos iniciados pelo Control.
3. **Readiness** — relaciona portas 3000–3007 aos apps canônicos e diferencia
   livre, externa, iniciando, pronta e degradada.

### P1

4. **Tray e show/hide** — fechar oculta, tray restaura, ação Sair encerra, e
   `Ctrl+Shift+M` alterna a janela quando o atalho está disponível.
5. **Workspace pulse** — branch, quantidade de arquivos modificados e estado
   ahead/behind sob refresh explícito; sem watcher Git.
6. **Doctor** — verifica Windows, Node 22, pnpm 9, Rust, WebView2, Git e validade
   do workspace selecionado.
7. **Gates rápidos** — executa somente `typecheck`, `lint`, `test:smoke` e
   `prisma:validate`, um por vez, com status, duração e últimas linhas.
8. **Quick jump** — abre rotas locais prontas, Explorer e terminal no workspace
   por ações fixas; não aceita executável, URL ou comando arbitrário da UI.

### P2

9. **Feedback e preferências** — tema, sons, volume, notificações, iniciar com o
   Windows e comportamento de fechamento. Usa o Sound System Matriz de forma
   discreta para startup, success, error e interaction.

Wallpaper não entra no v0.1. A arquitetura de janela, assets e preferências não
assume uma única superfície, permitindo estudar um companion de wallpaper em
uma fase independente.

## UX

A janela inicial mede aproximadamente 430 × 620 px, pode reduzir até 380 ×
520 px e usa uma única superfície. O topo contém marca, pulso geral, refresh e
hide. A área principal abre diretamente em portas. Uma rail compacta de cinco
ícones alterna entre Portas, Apps, Ações, Doctor e Preferências.

Não há dashboard, onboarding ou parágrafos. Estados usam pontos, números,
ícones, tooltips e labels curtos. Matar um processo é uma ação direta; matar
vários exige uma confirmação compacta com quantidade. Estados mudam em até
120 ms na UI; animações são de 80–140 ms e respeitam reduced motion.

Transparência é usada somente na moldura/superfície, com contraste sólido sob
conteúdo operacional. A janela usa cantos e sombra nativos quando disponíveis;
não depende de blur para legibilidade.

## Arquitetura

```text
apps/matriz-desktop
├── src
│   ├── domain          tipos e invariantes puros
│   ├── application     casos de uso e DesktopGateway
│   ├── integration     adapter Tauri e fallback indisponível
│   └── ui              uma control surface e view models
├── src-tauri
│   └── src
│       ├── ports       adapter Win32 IP Helper
│       ├── processes   snapshot seguro e término
│       ├── workspace   validação, Git, doctor e quick actions
│       ├── tasks       filhos allowlisted, logs e gates
│       ├── settings    JSON atômico em AppData
│       └── shell       janela, tray, shortcut e lifecycle
└── docs
```

O frontend nunca importa `@tauri-apps/api` fora de
`src/integration/tauri`. Componentes consomem view models e ações do gateway.
O Rust expõe DTOs serializáveis pequenos; nenhuma entidade do frontend atravessa
o IPC sem validação.

## Segurança

- Não existe comando genérico `exec`, `shell`, `readFile` ou `killByName`.
- Portas vêm de `GetExtendedTcpTable`; nenhum parsing de `netstat`.
- Um PID só pode ser encerrado se estiver no último snapshot emitido pelo
  backend e não for 0, 4, o próprio processo ou ancestral protegido.
- `TerminateProcess` abre o handle somente com `PROCESS_TERMINATE |
  SYNCHRONIZE`; falhas de acesso viram feedback, nunca elevação.
- Launcher e gates usam executable + argumentos fixos, sem `cmd /c` e sem
  interpolação de input.
- O workspace precisa conter `package.json` com `name: matriz` e
  `pnpm-workspace.yaml`; o caminho é canonicalizado antes de uso.
- Quick-jump aceita apenas IDs do catálogo embarcado.
- Uma única capability é associada somente à janela `main`, com CSP local e
  sem remote URLs.

## Performance

Portas são atualizadas ao abrir, sob refresh e a cada cinco segundos enquanto a
janela estiver visível. O polling para quando oculta. Git e doctor são somente
sob demanda. Logs usam ring buffer de 200 linhas por tarefa. Apenas a view
ativa é renderizada. Metas de aceitação em máquina de desenvolvimento:

- janela interativa em até 1,5 s após cold launch;
- uso ocioso inferior a 120 MB de RAM;
- CPU ociosa média inferior a 1%;
- instalador sem WebView2 fixo inferior a 25 MB.

## Distribuição

`pnpm --filter @matriz/app-matriz-desktop package` gera NSIS x64 em
`src-tauri/target/release/bundle/nsis`. O modo é `perUser`; Windows 11 fornece
WebView2 e o instalador mantém o bootstrapper como fallback. O artefato inicial
é não assinado e o README declara o aviso SmartScreen.

Uma workflow Windows valida testes TS/Rust, build frontend e package. Assinatura
e updater ficam fora do v0.1 porque exigem certificado e endpoint de release;
as configurações de bundle permanecem compatíveis com ambos.

## Validação

- testes Vitest de domínio, presenter, gateway e interações;
- testes Rust de validação, catálogo allowlisted, snapshots e preferências;
- integração Windows real para enumerar portas e recusar PID inválido;
- lint, TypeScript estrito, `cargo fmt`, `cargo clippy -D warnings`;
- build Vite e `tauri build --bundles nsis`;
- instalar silenciosamente em perfil de teste, abrir, verificar processo e
  janela, persistir configuração, fechar/tray, desinstalar;
- validar as nove features e medir startup, RAM/CPU ociosos;
- gates globais do monorepo por tocar manifest, constants, config e CI.

## Limitações aceitas no v0.1

- Windows 11 x64 é o único alvo verificado;
- processos elevados podem recusar término; o app não solicita admin;
- apenas TCP listening entra no primeiro catálogo, não UDP/conexões remotas;
- updater e assinatura dependem de infraestrutura externa;
- wallpaper permanece uma pesquisa futura separada.
