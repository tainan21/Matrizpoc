# Matriz Control — Auditoria do Navegador Local Inteligente

**Data:** 25 de agosto de 2026
**Escopo auditado:** plano aprovado nesta conversa, implementação integrada em `codex/matriz-hub-alpha` e evidências produzidas durante a execução.
**Commit de origem do navegador:** `bf7ff5d` (`feat(matriz-control): add intelligent local browser`).

## Veredito executivo

**Não: o plano literal não foi 100% concluído.**

O objetivo inicial mais simples — adicionar ao Matriz Control uma fundação de navegador local inteligente, app-local, segura e evolutiva — foi alcançado. Existe rota `/browser`, host Electron 44, Chromium nativo por `WebContentsView`, cápsulas isoladas, cofre BitLocker/VHDX, editor seguro, laboratório WebGL/áudio e automação MCP tipada.

O plano aprovado, porém, também exigia fluxos completos de biblioteca, grupos/duplicação/fusão de cápsulas, quotas reais, configuração de busca por cápsula, centralização integral no `BrowserRuntime`, instalador validado e E2E de Electron, MCP e BitLocker. Esses pontos ficaram parciais ou sem evidência de aceite.

### Placar verificável

- **32 completos** — implementação e evidência suficientes para o checkpoint.
- **15 parciais** — existe estrutura ou fluxo principal, mas falta acabamento ou aceite ponta a ponta.
- **9 ausentes/não comprovados** — não há fluxo operacional completo ou teste de aceite exigido.
- **56 checkpoints auditados** — contagem de cobertura, sem ponderação artificial de complexidade.

Em duas lentes:

- **MVP “simples, inteligente e com conceitos certos”: concluído como fundação utilizável.**
- **Plano integral e pronto para declarar 100%: ainda não concluído.**

## O que está efetivamente entregue

- Rota `/browser` integrada ao shell e ao manifest, com as três capabilities aprovadas.
- UI roxa orientada pelo Superdesign, com cápsulas, abas, barra unificada, viewport nativo e painel contextual.
- Electron `44.0.0`, Next standalone e fallback web diagnóstico.
- `WebContentsView` com Node desabilitado, sandbox, `contextIsolation` e `webSecurity`.
- Sessões Chromium separadas por cápsula; persistentes dentro do cofre e efêmeras quando ele está fechado.
- Backend BitLocker/VHDX, chave final protegida por `safeStorage`, gravação atômica e lock/unlock controlado.
- SQLite app-local para cápsulas, abas, bookmarks, notas, downloads e auditoria.
- Limite de oito abas vivas com suspensão de abas de fundo.
- Navegação, busca DDG, voltar, avançar, recarregar, screenshot, PDF e leitura textual.
- Downloads e artefatos recusados fora do cofre.
- Laboratório WebGL2 com shader/FPS e teste de áudio.
- Editor CodeMirror com allowlist de projeto, extensões textuais, limite de 2 MiB, bloqueio de symlink/escape, escrita atômica e conflito por hash.
- MCP STDIO `1.30.0`, named pipe autenticado, arquivo de descoberta protegido por ACL e kill switch.
- Políticas `human`, `agent-safe` e `agent-full`, com confirmação humana para elevar autoridade.
- Auditoria sem registrar texto digitado ou conteúdo autenticado.
- Revisão independente de segurança e correção dos achados críticos encontrados.

## Matriz de conformidade com o plano

Legenda: **Completo**, **Parcial**, **Ausente/não comprovado**.

### 1. Design aprovado antes do código

1. **Completo — autenticação e contexto Superdesign.** Os seis arquivos de contexto foram criados em `.superdesign/init/`.
2. **Completo — análise da UI existente.** O shell e a linguagem visual do Control orientaram a solução.
3. **Completo — duas variações de `/browser`.** As direções Focused Workspace e Operational foram produzidas no Superdesign.
4. **Completo — direção escolhida.** Focused Workspace foi selecionada e materializada em `.superdesign/browser-focused.html`.

### 2. Host desktop opcional

5. **Completo — Electron 44 e configuração app-local.** Versão fixada e compilação desktop separada.
6. **Completo — Next standalone e fallback web.** `/browser` funciona no modo web com diagnóstico quando o bridge não existe.
7. **Completo — hardening da superfície remota.** Node desligado, sandbox, `contextIsolation` e `webSecurity` ativos.
8. **Completo — sessão por cápsula.** `session.fromPath` é usado no cofre; fora dele, partição efêmera sem cache persistente.
9. **Parcial — posicionamento da view nativa.** O código reporta bounds e reage a resize/painel, mas não há E2E visual que prove alinhamento, dock e troca de rota.
10. **Parcial — lifecycle completo da superfície.** Criação, ativação, suspensão e fechamento existem; comportamento em todas as rotas/painéis não foi automatizado.
11. **Completo — configuração NSIS.** `electron-builder` e recursos standalone estão declarados.
12. **Ausente/não comprovado — instalador produzido e instalado.** O build web e o smoke do host passaram, mas o NSIS desta feature não foi certificado em instalação real.

### 3. Cofre e cápsulas

13. **Completo — `VaultBackend` e `BitLockerVhdxVault`.** Interface e implementação estão presentes.
14. **Parcial — setup elevado e guiado.** Há controles de UI e helper PowerShell, mas a elevação não é orquestrada por um wizard próprio; o app precisa ser iniciado com autoridade adequada.
15. **Completo — chave protegida.** A chave final é criada antes do VHDX, protegida por `safeStorage` e gravada atomicamente; não aparece em argumentos, logs ou MCP.
16. **Completo — unlock/lock por sessão.** O runtime abre e fecha storage e views de forma coordenada.
17. **Completo — fechamento antes do unmount.** Views e SQLite são encerrados antes do lock.
18. **Parcial — recuperação após crash.** `status()` detecta VHDX anexado e volume bloqueado/desbloqueado, mas falta um cenário E2E de crash e recuperação.
19. **Completo — dados no VHDX.** SQLite, profiles, downloads e artifacts usam o root montado; capturas/downloads são recusados sem cofre.
20. **Ausente/não comprovado — grupos e duplicação de cápsulas.** `groupId` existe no modelo, mas faltam comandos, UI e persistência de operações de grupo/duplicação.
21. **Parcial — fusão segura.** `mergeSafeLibrary()` e teste unitário existem; não há use case, comando, transação ou UI que execute a fusão.
22. **Completo — até oito abas vivas.** Algoritmo e enforcement no host existem, preservando ativa e `pinnedLive`.
23. **Ausente/não comprovado — quotas reais.** Há função de domínio para warning, mas a UI usa números fixos (`142`, `89`, `0`) e não mede 1 GB por cápsula/20 GB globais.

### 4. Experiência do navegador

24. **Completo — manifest e capabilities.** `/browser` e `control.browser.use`, `control.browser.capsules`, `control.browser.automate` estão registrados.
25. **Completo — layout aprovado.** Rail de cápsulas, centro com abas/endereço/conteúdo e painel contextual estão implementados.
26. **Completo — DuckDuckGo padrão.** Navegação textual usa DDG.
27. **Ausente/não comprovado — Google/custom configuráveis por cápsula.** O domínio suporta os tipos, mas não há comando/UI para alterar o provider persistido.
28. **Completo — navegação principal.** Abrir, ativar, fechar por comando, navegar, voltar, avançar e recarregar existem.
29. **Parcial — busca na página.** `page.find` existe no bridge/host, mas não há controle visível nem ferramenta MCP correspondente.
30. **Ausente/não comprovado — histórico operacional.** O painel mostra “Histórico”, porém não há schema/use case de gravação e consulta de visitas.
31. **Ausente/não comprovado — favoritos, notas e abas salvas completos.** Tabelas e busca existem, mas faltam CRUD, botões funcionais e restauração de conjuntos salvos.
32. **Parcial — downloads.** Download, persistência de estado e evento existem; o painel “Downloads” não lista nem gerencia registros.
33. **Parcial — restauração de abas.** Abas persistem no SQLite, porém reinício/persistência de sessão não foi coberto por Electron E2E.
34. **Completo — screenshot, PDF e leitura.** Os três fluxos existem e artefatos são protegidos pelo cofre.
35. **Parcial — WebGL2 e áudio.** O laboratório interno funciona em código; faltam E2E de GPU, permissões e conteúdo remoto WebGL/áudio.
36. **Completo — feedback sonoro opt-in.** `@matriz/design-ui/sounds` acompanha feedback visual.

### 5. Editor local seguro

37. **Completo — CodeMirror 6.** Editor dinâmico com linguagens textuais.
38. **Completo — projetos catalogados e paths relativos.** IDs desconhecidos e paths absolutos/escapes são negados.
39. **Completo — allowlist textual e 2 MiB.** Extensões e tamanho são validados.
40. **Completo — symlink, escape e atomicidade.** `lstat`, `realpath`, boundary check e rename atômico são usados.
41. **Parcial — conflitos por hash/mtime.** O conflito por hash está implementado; o `mtime` não participa da versão como exigido literalmente.

### 6. Automação e extensibilidade

42. **Parcial — centralização no `BrowserRuntime`.** Cápsulas e abertura/listagem de abas passam pelo runtime; navegação, páginas, arquivos, vault, downloads e políticas ainda são despachados em `desktop/main.ts`.
43. **Completo — bridge mínimo.** Renderer recebe apenas `invoke`, `subscribe` e `reportViewport`, com validação de remetente/origem/payload.
44. **Completo — MCP + named pipe + ACL.** SDK 1.30, token local, endpoint efêmero e ACL do usuário atual.
45. **Parcial — conjunto inicial de ferramentas MCP.** Navegação, snapshot, screenshot, click, type, download, biblioteca, arquivos e kill existem; falta ferramenta de política, deliberadamente bloqueada no MCP atual.
46. **Completo — sem superfícies perigosas.** Não há shell, JavaScript arbitrário, cookies, tokens, env ou paths absolutos expostos.
47. **Completo — presets e delegação humana.** Human começa sem delegação; safe é padrão do MCP; full exige UI humana.
48. **Parcial — bloqueio de alto impacto.** Credenciais e vocabulário sensível são classificados, mas regex/heurística não substitui política site-a-site ou confirmação transacional robusta.
49. **Completo — auditoria minimizada.** Registra ação, cápsula, origem, horário e resultado; não registra texto digitado.
50. **Ausente/não comprovado — MCP E2E.** Não foi executado um teste automatizado completo agente → pipe → Electron → página/arquivo/política.

### 7. Testes e aceite

51. **Parcial — unitários.** Há cobertura forte de URLs, políticas, merge, suspensão, quotas, paths, atomicidade e cofre, mas não de toda a matriz originalmente listada.
52. **Parcial — integrações com adapters falsos.** Cofre, SQLite e editor têm testes; downloads, biblioteca completa e crash recovery não têm suíte equivalente.
53. **Ausente/não comprovado — Electron E2E completo.** O host abriu e `/browser` respondeu 200, mas cookies separados, persistência, WebGL remoto, áudio, suspensão/restauração e ausência de Node não foram automatizados ponta a ponta.
54. **Completo — BitLocker dry-run.** O helper respondeu `supported: true` sem mudar estado de disco.
55. **Ausente/não comprovado — smoke BitLocker real.** Nenhum VHDX real foi provisionado/montado durante esta execução.
56. **Completo — gates obrigatórios executados.** Testes, lint, typecheck, build e smoke global passaram no merge realizado nesta conversa.

## Evidências de validação produzidas nesta conversa

- Matriz Control após integração: **43 testes aprovados**.
- Smoke global: **149 testes aprovados**.
- Lint: aprovado sem warnings.
- Typecheck web + desktop: aprovado após materializar as dependências do lockfile.
- Next production build: aprovado; rota `/browser` gerada.
- Electron: versão `44.0.0` iniciada; `/browser` respondeu 200; processos encerrados limpos.
- BitLocker helper: dry-run aprovado, sem alteração em disco.
- Revisão independente: achados críticos corrigidos e revalidados antes do merge.

Essas evidências comprovam compilação, contratos e smoke de inicialização. Elas **não** substituem os E2E funcionais ausentes descritos acima.

## Itens intencionalmente fora do MVP

Não devem ser classificados como esquecimento, pois o plano os adiou explicitamente:

- sincronização remota ou multiusuário;
- autofill/cofre de senhas;
- importação autenticada de sessões existentes;
- acesso remoto ao browser/MCP;
- fusão de cookies, tokens ou credenciais;
- suporte desktop fora de Windows 10/11 com BitLocker.

## Riscos que permanecem

- **Confiança de aceite:** sem Electron E2E e MCP E2E, regressões de integração podem escapar mesmo com TypeScript e unitários verdes.
- **Promessa visual maior que a função:** Biblioteca e indicadores de cache parecem operacionais, mas parte dos controles é apenas apresentação.
- **Recuperação do cofre:** o desenho está endurecido, porém crash e BitLocker real precisam de prova manual controlada.
- **Autoridade distribuída no host:** `desktop/main.ts` ainda concentra operações que o plano destinava a `BrowserRuntime.execute()`.
- **Política agent-safe:** classificação textual é uma defesa útil, não uma garantia universal contra toda ação de alto impacto.
- **Empacotamento:** configuração NSIS não equivale a instalação certificada em máquina limpa.

## Lista recomendada para chegar a 100%

### Onda A — fechar o aceite do núcleo

- Criar Electron E2E para HTTPS, isolamento de cookies, persistência, WebGL2, áudio, suspensão/restauração e ausência de Node.
- Criar MCP E2E para agente-safe, cápsula humana negada, edição permitida, kill switch e agent-full confirmado na UI.
- Gerar o NSIS e executar instalação, primeira abertura, atualização/reinstalação e desinstalação em Windows limpo.
- Executar smoke BitLocker real em VHDX descartável, incluindo crash recovery e lock recusado.

### Onda B — completar as funções prometidas na UI

- Implementar histórico real e CRUD de favoritos, notas e abas salvas.
- Tornar o painel Biblioteca funcional, incluindo downloads, screenshots e PDFs.
- Implementar busca na página visível e atalhos de teclado.
- Implementar configuração DDG/Google/custom por cápsula.
- Adicionar fechar/pinar aba na UI e provar a suspensão/restauração de oito abas.

### Onda C — completar cápsulas e armazenamento

- Implementar grupos, duplicação e fusão segura transacional de cápsulas.
- Medir uso real por cápsula/global e emitir warnings em 1 GB/20 GB sem auto-delete.
- Substituir os valores fixos de cache da UI por ViewModels calculados.
- Completar recuperação pós-crash com estado explícito e ação guiada.

### Onda D — consolidar arquitetura e segurança

- Levar todas as operações para a união fechada `BrowserCommand` em `BrowserRuntime.execute()`.
- Manter `desktop/main.ts` como adapter de Electron, sem regra operacional central.
- Incluir `mtime` na detecção de conflito do editor e teste específico de symlink.
- Trocar classificação genérica de alto impacto por regras confirmáveis/site-aware quando necessário.
- Definir uma ferramenta MCP de leitura de política; alterações de política devem continuar humanas por padrão.

## Critério objetivo para declarar 100%

Declarar o plano concluído somente quando:

- todos os 15 checkpoints parciais forem fechados ou formalmente reduzidos por decisão registrada;
- os 9 checkpoints ausentes/não comprovados tiverem implementação e evidência;
- Electron E2E, MCP E2E, instalador NSIS e smoke BitLocker real passarem;
- nenhum controle visual permanecer inerte ou mostrar métricas fixas como se fossem reais;
- os cinco comandos de validação do plano passarem novamente no commit candidato final.

## Estado de integração e preservação

- A feature do navegador foi integrada por fast-forward na branch `codex/matriz-hub-alpha`.
- O commit `bf7ff5d` permanece no histórico.
- Alterações locais de outros trabalhos foram preservadas e não foram incluídas na feature.
- Nenhuma branch ou worktree foi apagada durante a integração.
- O repositório avançou após o merge com outros commits; esta auditoria usa o estado atual para checar consistência, mas atribui as evidências desta conversa ao momento em que foram executadas.

## Conclusão

Construímos uma base séria, segura e corretamente app-local — muito além de um mock visual. Mas ainda não devemos chamar o plano inteiro de 100% concluído. O próximo passo correto não é recomeçar: é transformar as estruturas já existentes em fluxos completos e fechar os quatro gates de aceite real (Electron, MCP, instalador e BitLocker).

**Resumo em uma frase:** o navegador inteligente nasceu; agora falta completar a biblioteca, a gestão avançada de cápsulas e a certificação ponta a ponta para promovê-lo de fundação funcional a entrega integral.
