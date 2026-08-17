# Auditoria visual das 101 rotas

Data: 17 de agosto de 2026.

Foram auditadas 101 rotas dos sete apps em desktop `1440×1000` e mobile `390×844`, além de 14 capturas TV `1920×1080`. O lote final contém 216 imagens com dimensões verificadas e no máximo duas tentativas cumulativas por combinação.

## Resumo executivo

- 216/216 capturas finais produzidas; nenhuma combinação pendente.
- Os seis acessos foram incluídos: cinco `/login` e o `/unlock` do Workbench.
- A sessão mock oficial foi usada em `localhost`; o token local documentado `1234` foi usado no Workbench de desenvolvimento.
- Rotas Docs dependentes de PostgreSQL registram a indisponibilidade real de `localhost:5432`; IDs inexistentes exibem os estados reais.
- O Workbench expõe estados inválidos quando diretórios locais `.matriz` esperados não existem; são achados da auditoria, não falhas de captura.
- Screenshots permanecem em `output/visual-route-audit`, ignorado pelo Git; o relatório usa links relativos para consulta local.

---

Fonte: capturas finais em output/visual-route-audit/matriz-hub e capture-results.json. Total: 48 entradas H01–H48. Cada entrada registra observações concretas de desktop/mobile (e TV quando existente).

## 1. Visão geral do Hub (/)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/home.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/home.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop exposes full left navigation and overview map; mobile collapses navigation to a compact header and keeps the selected-area panel. Seven apps appear with “Sem leitura”, so the visual hierarchy is present but health content is sparse.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/; heading vazio.

## 2. Presença de agentes e pessoas (/agents)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/agents.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/agents.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Both viewports keep the operational shell and show “Presença de agentes e pessoas”; the desktop has room for actor/activity summaries, while mobile stacks them. Concrete state: 3 identities, 4 JSONL activities, 0 live presence.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/agents; heading “Presença de agentes e pessoas”.

## 3. Arquitetura do ecossistema (/architecture)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/architecture.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/architecture.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop presents the architecture heading, 7 manifests, 9 producer/consumer relations and 35 capabilities; mobile preserves the same metric-first order and stacks the app list. The card explicitly says the map is declared, not runtime.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/architecture; heading “Arquitetura do ecossistema”.

## 4. Uma base promissora. / Ainda não uma plataforma. (/audit)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/audit.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/audit.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Ir para o conteúdo M/ Matriz ARQUITETURA EVIDÊNCIAS 30 PASSOS 27 JUL 2026 PRINCIPAL ARCHITECTURE REVIEW · SNAPSHOT…
- **Pontos fortes:** The editorial page uses a distinct dark/light review composition with a large verdict and score; mobile compresses the narrative into a vertical flow. Concrete content includes 4.2/10, 5 apps, 118 smokes and 30 next steps.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/audit; heading “Uma base promissora. / Ainda não uma plataforma.”.

## 5. Áreas do ecossistema (/catalog)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/catalog.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/catalog.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop shows metric cards for 7 apps, 41 declared routes, 35 actions and 12 integrations before the catalog; mobile retains the same hierarchy in a single column. App cards expose status, version, contract and base URL.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/catalog; heading “Áreas do ecossistema”.

## 6. A memória persistida não respondeu (/docs)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** Both viewports retain the Docs navigation and an unavailable-state panel rather than an empty fake library. The panel names the missing HUB_DATABASE_URL, Prisma Client generation and migration; no documents are rendered.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs; heading “A memória persistida não respondeu”.

## 7. A memória persistida não respondeu (/docs/sample-document)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--sample-document.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--sample-document.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The dynamic document route keeps the document-oriented shell in desktop/mobile but resolves to the same Prisma-unavailable panel; the expected document title, actions and body are absent because sample-document cannot be read.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/sample-document; heading “A memória persistida não respondeu”.

## 8. A memória persistida não respondeu (/docs/sample-document/edit)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--sample-document--edit.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--sample-document--edit.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** Desktop/mobile show the edit route inside Docs navigation, then the persistence error panel; the edit form and save controls do not appear because the document lookup cannot reach Prisma.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/sample-document/edit; heading “A memória persistida não respondeu”.

## 9. A memória persistida não respondeu (/docs/sample-document/graph)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--sample-document--graph.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--sample-document--graph.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The graph subroute preserves the Docs shell and unavailable panel at both widths; graph nodes/edges are not shown because sample-document is unavailable, not because the graph is empty.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/sample-document/graph; heading “A memória persistida não respondeu”.

## 10. A memória persistida não respondeu (/docs/sample-document/timeline)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--sample-document--timeline.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--sample-document--timeline.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The timeline subroute has the same visible Docs hierarchy and Prisma-unavailable state on desktop/mobile; no timeline rows or empty-timeline state can be distinguished.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/sample-document/timeline; heading “A memória persistida não respondeu”.

## 11. A memória persistida não respondeu (/docs/sample-document/versions)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--sample-document--versions.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--sample-document--versions.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** Desktop/mobile show Docs navigation plus the persistence failure; version cards and publish controls are not rendered for sample-document.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/sample-document/versions; heading “A memória persistida não respondeu”.

## 12. A memória persistida não respondeu (/docs/approvals)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--approvals.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--approvals.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The approvals URL renders the Docs shell but the central panel reports persistence unavailable in both viewports; approval rows and their empty state are not observable.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/approvals; heading “A memória persistida não respondeu”.

## 13. A memória persistida não respondeu (/docs/context)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--context.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--context.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The context list route shows the Docs frame and the exact persistence diagnostic on desktop/mobile; context cards and create action are blocked by missing Prisma.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/context; heading “A memória persistida não respondeu”.

## 14. A memória persistida não respondeu (/docs/context/sample-context)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--context--sample-context.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--context--sample-context.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The dynamic context detail keeps the Docs frame but cannot resolve sample-context; desktop/mobile show the unavailable panel instead of package items or publish action.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/context/sample-context; heading “A memória persistida não respondeu”.

## 15. A memória persistida não respondeu (/docs/converter)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--converter.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--converter.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The converter route remains inside Docs navigation, but the persistence panel occupies the content area in both widths; conversion controls and document results are unavailable.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/converter; heading “A memória persistida não respondeu”.

## 16. A memória persistida não respondeu (/docs/entities)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--entities.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--entities.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The entities route shows the Docs shell and Prisma diagnostic; the entity grid/form is not shown, so no-data versus database failure is explicitly separated by the message.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/entities; heading “A memória persistida não respondeu”.

## 17. A memória persistida não respondeu (/docs/entities/sample-entity)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--entities--sample-entity.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--entities--sample-entity.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The dynamic entity page displays the same persistence-unavailable state; the entity inspector, relations and timeline are absent at both widths.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/entities/sample-entity; heading “A memória persistida não respondeu”.

## 18. A memória persistida não respondeu (/docs/exports)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--exports.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--exports.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** Desktop/mobile preserve Docs navigation while showing the database-unavailable panel; export form and artifacts do not appear, so no export 404 is inferred.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/exports; heading “A memória persistida não respondeu”.

## 19. A memória persistida não respondeu (/docs/governance)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--governance.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--governance.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The governance route renders the unavailable persistence state inside the Docs shell; governance candidates are not listed and the screen does not fabricate an empty queue.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/governance; heading “A memória persistida não respondeu”.

## 20. A memória persistida não respondeu (/docs/graph)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--graph.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--graph.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The global graph route shows Docs navigation and the Prisma diagnostic; no graph canvas/list is available to assess density or responsive behavior.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/graph; heading “A memória persistida não respondeu”.

## 21. Importar documento (/docs/import)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--import.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--import.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop shows a titled “Importar documento” form with stacked fields/actions; mobile keeps the title and form hierarchy in one column. This route is available even while read-oriented Docs pages report Prisma unavailable.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/import; heading “Importar documento”.

## 22. A memória persistida não respondeu (/docs/mcp)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--mcp.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--mcp.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The MCP route keeps the Docs shell but displays the persistence diagnostic; MCP resources/tools are not listed and no empty-resource claim is made.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/mcp; heading “A memória persistida não respondeu”.

## 23. Criar documento (/docs/new)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--new.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--new.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Both viewports render the “Criar documento” form with its heading and action hierarchy; the capture does not show a post-submit result, so persistence success is unverified.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/new; heading “Criar documento”.

## 24. A memória persistida não respondeu (/docs/review-desk)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--review-desk.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--review-desk.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The review desk keeps Docs navigation but is replaced by the persistence-unavailable panel at both widths; suggestions/contexts are not visually inspectable.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/review-desk; heading “A memória persistida não respondeu”.

## 25. A memória persistida não respondeu (/docs/runs)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--runs.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--runs.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The runs route shows the Docs frame and missing-persistence diagnostic; no run rows, status badges or empty state can be evaluated.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/runs; heading “A memória persistida não respondeu”.

## 26. Settings (/docs/settings)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--settings.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--settings.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop/mobile render the Settings heading inside the Docs navigation rather than the Prisma error; the page is low-density explanatory/configuration content, with no visible data table.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/settings; heading “Settings”.

## 27. A memória persistida não respondeu (/docs/suggestions)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--suggestions.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--suggestions.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The suggestions route renders the persistence-unavailable state; the suggestion list and review actions are absent rather than empty.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/suggestions; heading “A memória persistida não respondeu”.

## 28. A memória persistida não respondeu (/docs/tasks)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--tasks.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--tasks.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The tasks route shows the same Docs shell and exact Prisma diagnostic; task candidates are not displayed.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/tasks; heading “A memória persistida não respondeu”.

## 29. A memória persistida não respondeu (/docs/timeline)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/docs--timeline.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/docs--timeline.png)

- **Intenção:** Operar a memória documental.
- **Conceito:** Knowledge shell com leitura/ações documentais.
- **Contexto e conteúdo esperado:** A imagem mostra a área solicitada, mas a mensagem informa que a memória persistida não respondeu. O conteúdo funcional esperado deve aparecer após HUB_DATABASE_URL, Prisma Client e migration estarem disponíveis.
- **Pontos fortes:** The institutional timeline route is visually limited to Docs navigation plus unavailable persistence; no chronology or empty timeline is rendered.
- **Pontos fracos:** O estado de erro Prisma impede avaliar dados, ações e densidade específicos da rota.
- **Recomendação:** Corrigir a dependência Prisma indicada na própria tela e repetir a captura; não substituir por seed inventado.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/docs/timeline; heading “A memória persistida não respondeu”.

## 30. Mapa de relações (/ecosystem)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/ecosystem.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/ecosystem.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** The relation map heading and event-link surface render in both widths; desktop has more horizontal room for producer/consumer columns, while mobile stacks relation sides. The capture shows declared relationships, not a live health feed.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/ecosystem; heading “Mapa de relações”.

## 31. Fluxo de eventos (/events)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/events.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/events.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop presents the event-flow heading and feed structure; mobile stacks the event rows and metadata. The route is rendered with its operational shell; the capture does not show a 404 or Prisma error.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/events; heading “Fluxo de eventos”.

## 32. Relações entre entidades (/external-links)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/external-links.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/external-links.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** The relations heading and tenant/link summary render in both widths; desktop supports denser rows, mobile wraps metadata. The visible state is data-backed, not an unavailable panel.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/external-links; heading “Relações entre entidades”.

## 33. Controles de capacidade (/feature-flags)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/feature-flags.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/feature-flags.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Both viewports show the capability-controls heading and tenant-oriented cards; desktop is denser, mobile stacks cards. The capture exposes seeded controls/statuses rather than an error state.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/feature-flags; heading “Controles de capacidade”.

## 34. Saúde do ecossistema (/health)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/health.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/health.png) · [TV](../output/visual-route-audit/matriz-hub/tv/health.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop and TV are designed as a monitoring surface with metric cards and project rows; mobile stacks those summaries. The captured state shows the health heading and data shell, but not a redirect or Prisma failure.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200,200; finalUrl http://localhost:3000/health; heading “Saúde do ecossistema”.

## 35. Route + API Health Checks (/health/checks)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/health--checks.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/health--checks.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** The route renders “Route + API Health Checks”; desktop has room for check controls/results, mobile stacks them. The capture is an available checks surface, with no 404 observed in finalUrl.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/health/checks; heading “Route + API Health Checks”.

## 36. Intelligence (/intelligence)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/intelligence.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/intelligence.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** The Intelligence heading and category-oriented dashboard render at both widths; desktop can show multiple metric slots, mobile stacks them. The capture is an operational dashboard, not an unavailable state.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/intelligence; heading “Intelligence”.

## 37. Entre uma vez. Circule por toda a Matriz. (/login)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/login.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/login.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Portal editorial bipartido de acesso.
- **Contexto e conteúdo esperado:** M M MyHub ECOSSISTEMA MATRIZ / 01 UMA IDENTIDADE, VARIAS PLATAFORMAS Entre uma vez. Circule por toda a Matriz. Acesse produtos independentes com a mesma identidade local, sem apagar o contexto de cada operacao. MATRIZ DE…
- **Pontos fortes:** The two-column desktop composition clearly separates dark brand story from light access panel; mobile stacks the story and access controls. Google/Código/Magic link/E-mail direto and Ana/Caio demo accounts are visible; heading is “Entre uma vez. Circule por toda a Matriz.”
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/login; heading “Entre uma vez. Circule por toda a Matriz.”.

## 38. Preparação das organizações (/onboarding-status)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/onboarding-status.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/onboarding-status.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop shows the preparation summary and two known tenants with per-app progress; mobile stacks tenant cards and statuses. Concrete state is 0 completed and 0 in preparation, not a loading error.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/onboarding-status; heading “Preparação das organizações”.

## 39. Entre uma vez. Circule por toda a Matriz. (/praticies)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/praticies.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/praticies.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** A rota original não aparece; o finalUrl documenta a tela de login conectada.
- **Pontos fortes:** Both captures end at /login rather than the requested immersive workbench; the visible hierarchy is the authenticated login panel with Ana connected and “Abrir MyHub/Sair de todas as plataformas”. No Praticies content is visible.
- **Pontos fracos:** O redirecionamento impede avaliar visualmente a rota solicitada.
- **Recomendação:** Repetir com a sessão/guard que a rota exige e investigar o redirecionamento.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/login; heading “Entre uma vez. Circule por toda a Matriz.”.

## 40. Entre uma vez. Circule por toda a Matriz. (/praticies/apps)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/praticies--apps.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/praticies--apps.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** A rota original não aparece; o finalUrl documenta a tela de login conectada.
- **Pontos fortes:** Both captures redirect to /login, so the app-store density, cards and install controls are not observable. The final screen is the connected Ana login state, not a 404.
- **Pontos fracos:** O redirecionamento impede avaliar visualmente a rota solicitada.
- **Recomendação:** Repetir com a sessão/guard que a rota exige e investigar o redirecionamento.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/login; heading “Entre uma vez. Circule por toda a Matriz.”.

## 41. Projetos em contexto (/projects)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/projects.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/projects.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop shows portfolio metrics (8 projects, 7 internal apps, 1 institutional source, 88% readiness) and a severity queue; mobile stacks the queue. Rows include attention/healthy markers, giving a concrete non-empty state.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/projects; heading “Projetos em contexto”.

## 42. MyHub (/projects/matriz%3Ahub)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/projects--matriz--3Ahub.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/projects--matriz--3Ahub.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** The project inspector renders “MyHub” with 100% readiness, 2 checks, 44 contracts and healthy signals; desktop lays out summary columns, mobile stacks them. No missing-project state is observed.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/projects/matriz%3Ahub; heading “MyHub”.

## 43. Uma rede de produtos, ventures e fontes operando sob o mesmo contrato institucional. (/public)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/public.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/public.png)

- **Intenção:** Apresentar a rede institucional publicamente.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não M Matriz Projetos Ecossistema Acessar Hub Rede Matriz · v1.2 institucional Uma rede de produtos, ventures e fontes…
- **Pontos fortes:** The public page renders a complete institutional hero and metrics in both widths; desktop is denser, mobile stacks sections. Concrete state: 8 public projects, 7 internal apps, 1 source, 6 healthy and 2 degraded.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/public; heading “Uma rede de produtos, ventures e fontes operando sob o mesmo contrato institucional.”.

## 44. Contratos do ecossistema (/registry)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/registry.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/registry.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop shows registry metrics (7 apps, 35 capabilities, 27 produced and 13 consumed events) before dense contract lists; mobile stacks those sections. The heading says “Contratos do ecossistema” and the registry is available.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/registry; heading “Contratos do ecossistema”.

## 45. Registro de entregas (/releases)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/releases.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/releases.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** The releases page shows a compact delivery ledger; desktop exposes timestamp/status/technical label columns, mobile wraps each row. Concrete state: 3 known deliveries, 1 validated and 2 awaiting explicit validation.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/releases; heading “Registro de entregas”.

## 46. Horizonte do Matriz-Hub (/roadmap)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/roadmap.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/roadmap.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop presents the local-plan summary and backlog queue; mobile stacks it. The state is explicitly sparse: 0 roadmap phases, 0 objectives, 3 local backlog files and 1 under review.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/roadmap; heading “Horizonte do Matriz-Hub”.

## 47. Entre uma vez. Circule por toda a Matriz. (/settings/appearance)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/settings--appearance.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/settings--appearance.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** A rota original não aparece; o finalUrl documenta a tela de login conectada.
- **Pontos fortes:** The requested settings route redirects to /login in both viewports; the visible screen is the connected Ana access panel. Appearance controls for the Hub are therefore not audited here.
- **Pontos fracos:** O redirecionamento impede avaliar visualmente a rota solicitada.
- **Recomendação:** Repetir com a sessão/guard que a rota exige e investigar o redirecionamento.
- **Resultado observado:** status 200,200; finalUrl http://localhost:3000/login; heading “Entre uma vez. Circule por toda a Matriz.”.

## 48. Telemetria da instância (/telemetry)

**Capturas:** [desktop](../output/visual-route-audit/matriz-hub/desktop/telemetry.png) · [mobile](../output/visual-route-audit/matriz-hub/mobile/telemetry.png) · [TV](../output/visual-route-audit/matriz-hub/tv/telemetry.png)

- **Intenção:** Exibir e operar a superfície solicitada do Hub.
- **Conceito:** Shell operacional com navegação contextual e view models da rota.
- **Contexto e conteúdo esperado:** M Sua organização recomenda Aurora. Experimente sem alterar sua preferência atual. Experimentar Agora não Pular para o conteúdo MyHub Projeto ativo Matriz Core Ambiente alpha local Sincronização Fontes reais Buscar uma á…
- **Pontos fortes:** Desktop and TV provide an observability layout with metric strip and feed area; mobile stacks it. Concrete empty state: 0 envelopes, 1 registered client, 0 active sources, and “Nenhuma telemetria nesta instância”; no signal is fabricated.
- **Pontos fracos:** Não há falha HTTP/404 registrada; diferenças finas de dobra e foco não são mensuradas pelo metadata.
- **Recomendação:** Preservar a hierarquia observada e validar teclado, foco, conteúdo longo e estados vazios.
- **Resultado observado:** status 200,200,200; finalUrl http://localhost:3000/telemetry; heading “Telemetria da instância”.




---

Fonte: `output/visual-route-audit/matriz-workbench` e `output/visual-route-audit/capture-results.json`.
Foram encontradas 29 rotas únicas, com capturas desktop/mobile em todas; TV
somente em `/` e `/control`. Links abaixo são relativos a este arquivo.

## 49. `/unlock` — Entre no seu workspace

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/unlock.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/unlock.png) · TV: sem captura.

- **Intenção:** desbloquear o workspace local.
- **Conceito:** split-screen de acesso protegido + showcase do design system.
- **Contexto/conteúdo esperado:** token local, ambiente local, mensagem de teste/produção e sessão HTTP-only.
- **Pontos fortes:** hierarquia muito clara; formulário e CTA dominam o painel direito; showcase explica o produto.
- **Pontos fracos:** a captura mobile mantém bastante conteúdo de marca antes do formulário; desktop registrou erro de HMR/401 no console.
- **Recomendação:** manter a composição desktop; no mobile priorizar o formulário e deixar a vitrine secundária recolhível.
- **Resultado observado real:** HTTP 200, URL final `/unlock`, título `Matriz Workbench`, heading “Entre no seu workspace.”; mobile exibe “Para teste local, use 1234”; não houve redirecionamento.

## 50. `/` — Foco

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/home.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/home.png) · [TV](../output/visual-route-audit/matriz-workbench/tv/home.png).

- **Intenção:** oferecer o foco diário do trabalho.
- **Conceito:** dashboard inicial com shell persistente e resumo de trabalho.
- **Contexto/conteúdo esperado:** itens em andamento, bloqueios e próximos focos.
- **Pontos fortes:** as três variantes mantêm o mesmo fallback legível e recuperável.
- **Pontos fracos:** o dashboard não chega ao conteúdo de foco; a falha de um diretório de agentes bloqueia a home inteira.
- **Recomendação:** corrigir a leitura do workspace antes de usar como painel; isolar o diretório ausente e adicionar estado vazio explícito quando não houver dados.
- **Resultado observado real:** desktop, mobile e TV HTTP 200, todos com heading “O workspace encontrou um estado inválido.” e `ENOENT` em `apps/contracts/.matriz/agents`; não houve redirecionamento.

## 51. `/control` — Controle

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/control.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/control.png) · [TV](../output/visual-route-audit/matriz-workbench/tv/control.png).

- **Intenção:** acompanhar o estado operacional consolidado.
- **Conceito:** console de controle com snapshot por projeto.
- **Contexto/conteúdo esperado:** saúde local, scorecards, sinais e filtro opcional por projeto.
- **Pontos fortes:** existe variante TV capturada; rota tem papel claro de supervisão e fallback uniforme.
- **Pontos fracos:** nenhum viewport chega ao snapshot operacional; a origem do `ENOENT` varia por viewport.
- **Recomendação:** tornar o snapshot resiliente a um projeto sem `.matriz` e mostrar “sem dados” por cartão.
- **Resultado observado real:** desktop/mobile/TV HTTP 200 com heading “O workspace encontrou um estado inválido.”. Desktop e TV mostram `ENOENT: scandir 'apps/sites/.matriz/backlog'`; mobile mostra `ENOENT: scandir 'apps/spot/.matriz/backlog'`.

## 52. `/praticies` — Apps locais

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/praticies.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/praticies.png) · TV: sem captura.

- **Intenção:** encontrar pequenas automações locais.
- **Conceito:** catálogo de praticidades integrado ao shell.
- **Contexto/conteúdo esperado:** apps locais, instalação e acesso rápido.
- **Pontos fortes:** heading “Apps locais” e CTA “Abrir loja” são claros; conteúdo mantém o conceito local-first.
- **Pontos fracos:** o inventário capturado não evidencia itens além do cabeçalho; a barra lateral mobile comprime navegação.
- **Recomendação:** dar maior presença aos cards/estados do catálogo e separar claramente instalado de disponível.
- **Resultado observado real:** HTTP 200 em desktop/mobile; heading `Apps locais`; texto inclui “Instale pequenas ferramentas…” e “Abrir loja”; sem redirecionamento.

## 53. `/settings` — Configurações

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/settings.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/settings.png) · TV: sem captura.

- **Intenção:** expor estado operacional e limites locais.
- **Conceito:** painel de configuração/health do Workbench.
- **Contexto/conteúdo esperado:** saúde local, preferências e experimento app-local.
- **Pontos fortes:** heading e eyebrow “Ambiente local” enquadram bem a finalidade.
- **Pontos fracos:** a captura não mostra um CTA ou ação dominante; mobile reduz contexto a uma coluna longa.
- **Recomendação:** agrupar saúde, aparência e integrações em cartões com ações e estados visíveis.
- **Resultado observado real:** HTTP 200; heading `Configurações`; texto começa “Estado operacional e limites deliberados da V1.”; console registrou 401 de recurso, sem redirecionamento.

## 54. `/sites` — Sites

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/sites.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/sites.png) · TV: sem captura.

- **Intenção:** acompanhar catálogo e publicação de Sites.
- **Conceito:** ponte de comunicação para o runtime Matriz Sites.
- **Contexto/conteúdo esperado:** publicações, pendências e link para o runtime.
- **Pontos fortes:** eyebrow “Comunicação · Matriz Sites” delimita o domínio; CTA “Abrir runtime” é direto.
- **Pontos fracos:** a captura não deixa claro o estado de cada publicação; mobile concentra muita navegação antes do conteúdo.
- **Recomendação:** destacar estado/pendência por site em uma tabela curta e reservar integração para uma seção secundária.
- **Resultado observado real:** HTTP 200; heading `Sites`; texto inclui “Catálogo, publicação e pendências essenciais por site” e “Abrir runtime”; console teve 401.

## 55. `/knowledge` — Conhecimento

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/knowledge.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/knowledge.png) · TV: sem captura.

- **Intenção:** navegar por fontes federadas sem copiar seus documentos.
- **Conceito:** catálogo read-only de conhecimento.
- **Contexto/conteúdo esperado:** fonte, tipo, estado de binding local e ação disponível.
- **Pontos fortes:** tabela desktop tem colunas claras (`Fonte`, `Tipo`, `Estado`, `Ação`); lista de fontes é legível.
- **Pontos fracos:** todas as fontes capturadas aparecem “sem binding local”, deixando a ação final vazia; mobile não tem captura aqui.
- **Recomendação:** tornar “sem binding” um estado acionável com explicação e CTA de vinculação somente leitura.
- **Resultado observado real:** HTTP 200, heading `Conhecimento`; quatro fontes visíveis e todas “sem binding local”; sem redirecionamento.

## 56. `/knowledge/matriz-infra-hub` — Fonte Matriz Infra Hub

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/knowledge--matriz-infra-hub.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/knowledge--matriz-infra-hub.png) · TV: sem captura.

- **Intenção:** abrir uma fonte federada específica.
- **Conceito:** detalhe read-only da fonte com documentos/pacotes.
- **Contexto/conteúdo esperado:** resumo da fonte, documentos selecionáveis e pacote/documento ativo.
- **Pontos fortes:** rota dedicada separa a fonte do catálogo e fornece fallback 404 legível.
- **Pontos fracos:** o fixture `matriz-infra-hub` não corresponde a uma fonte válida no estado capturado.
- **Recomendação:** usar um `sourceId` existente no roteiro e manter o 404 para fontes removidas.
- **Resultado observado real:** desktop/mobile HTTP 200 com heading “Este item não existe.” e mensagem 404; não houve redirecionamento.

## 57. `/work` — Inbox (redirect de entrada)

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/work.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/work.png) · TV: sem captura.

- **Intenção:** servir como entrada do espaço de trabalho.
- **Conceito:** rota agregadora do grupo Work.
- **Contexto/conteúdo esperado:** encaminhamento para a Inbox.
- **Pontos fortes:** o shell de trabalho mantém navegação Inbox/Backlog/Sprints.
- **Pontos fracos:** a rota não possui uma tela própria; sua qualidade visual depende inteiramente da Inbox de destino.
- **Recomendação:** capturar/mostrar o destino final no resultado da rota e evitar estado intermediário vazio.
- **Resultado observado real:** desktop/mobile HTTP 200, `finalUrl` é `/work/inbox`, heading `Inbox`; o arquivo está nomeado `work.png`, confirmando encaminhamento efetivo; sem redirecionamento externo.

## 58. `/work/inbox` — Inbox

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/work--inbox.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/work--inbox.png) · TV: sem captura.

- **Intenção:** curar entradas antes de transformá-las em trabalho permanente.
- **Conceito:** triagem com captura rápida e quatro contadores.
- **Contexto/conteúdo esperado:** entradas a classificar, classificadas, aceitas e descartadas.
- **Pontos fortes:** CTA “Capturar” e contadores são imediatamente encontráveis; estado vazio é explicado (“Capture uma frase…”).
- **Pontos fracos:** painel fica muito vazio com zero entradas; coluna de detalhe à direita permanece sem função aparente.
- **Recomendação:** manter o empty state, mas reduzir a área ociosa e dar à captura um fluxo de primeiro uso mais evidente.
- **Resultado observado real:** HTTP 200, heading `Inbox`; todos os contadores em `0`, “Nenhuma entrada aqui”/“Inbox vazia”; console registrou 401.

## 59. `/work/backlog` — Backlog

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/work--backlog.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/work--backlog.png) · TV: sem captura.

- **Intenção:** visualizar trabalho multi-projeto organizado.
- **Conceito:** quadro adaptativo por prontidão, relação e intenção.
- **Contexto/conteúdo esperado:** grupos de work items, filtros e link para capturar entrada.
- **Pontos fortes:** desktop/mobile têm tratamento de falha explícito com CTA “Tentar novamente”.
- **Pontos fracos:** não há backlog visível; a falha técnica ocupa toda a experiência.
- **Recomendação:** isolar projetos sem diretório `backlog` e renderizar os demais; não converter um `ENOENT` em erro global.
- **Resultado observado real:** HTTP 200, heading “O workspace encontrou um estado inválido.”; `ENOENT scandir 'apps/sites/.matriz/backlog'` em desktop e mobile; console também registrou 401.

## 60. `/work/sprints` — Sprints

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/work--sprints.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/work--sprints.png) · TV: sem captura.

- **Intenção:** comprometer tempo, intenção e outcomes.
- **Conceito:** lista de sprints adaptativas.
- **Contexto/conteúdo esperado:** sprints por estado/período e criação da primeira sprint.
- **Pontos fortes:** fallback de erro preserva linguagem do produto e oferece “Tentar novamente”.
- **Pontos fracos:** nenhum conteúdo de sprint foi renderizado por causa de erro de dados compartilhados.
- **Recomendação:** tratar a ausência de backlog de um projeto como item não inicializado, não como falha da lista inteira.
- **Resultado observado real:** HTTP 200; desktop/mobile mostram estado inválido com `ENOENT scandir 'apps/sites/.matriz/backlog'`; console inclui 401.

## 61. `/work/sprints/sample-sprint` — Detalhe da sprint

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/work--sprints--sample-sprint.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/work--sprints--sample-sprint.png) · TV: sem captura.

- **Intenção:** inspecionar e editar uma sprint específica.
- **Conceito:** detalhe de compromisso, trabalho, dependências e encerramento.
- **Contexto/conteúdo esperado:** `sprintId` válido, outcomes, itens e formulários de ciclo de vida.
- **Pontos fortes:** erro de domínio é apresentado em linguagem curta e recuperável.
- **Pontos fracos:** o fixture `sample-sprint` não é válido; não há conteúdo visual da sprint.
- **Recomendação:** usar um ID real no roteiro de captura e preservar 404/estado inválido para IDs de exemplo.
- **Resultado observado real:** HTTP 200; heading “O workspace encontrou um estado inválido.” e mensagem “ID de sprint inválido.” em desktop/mobile; console registra `WorkspaceError` em `getSprint` e 401.

## 62. `/projects` — Projetos

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects.png) · TV: sem captura.

- **Intenção:** descobrir e abrir projetos locais.
- **Conceito:** diretório de apps com resumo de detecção e workspaces.
- **Contexto/conteúdo esperado:** projetos, package, estado do workspace e fontes externas.
- **Pontos fortes:** tabela desktop é escaneável; métricas “8 apps detectados / 8 workspaces ativos / 4 fontes externas” dão contexto imediato; CTA “Planejar projeto”.
- **Pontos fracos:** volume de linhas é alto no mobile; o bloco de repositórios externos começa abaixo da dobra.
- **Recomendação:** manter métricas no topo e usar filtros/accordion no mobile.
- **Resultado observado real:** HTTP 200, heading `Projetos`; texto confirma 8 pastas válidas e lista 8 apps; console 401.

## 63. `/projects/new` — Planejar projeto

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--new.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--new.png) · TV: sem captura.

- **Intenção:** criar blueprint contract-first para um novo projeto.
- **Conceito:** formulário de prévia + aprovação.
- **Contexto/conteúdo esperado:** configuração mínima, tipo, target, plataformas, domínios e comandos de validação.
- **Pontos fortes:** título “Planejar projeto” e promessa de prévia são claros; fluxo diferencia planejamento de edição de código.
- **Pontos fracos:** no mobile o formulário é potencialmente longo e a captura informa “Nenhum código f…” sem completar a leitura.
- **Recomendação:** dividir campos em etapas curtas com resumo fixo da prévia.
- **Resultado observado real:** HTTP 200, heading `Planejar projeto`; texto inclui “Gere uma prévia contract-first…”; console 401; sem redirecionamento.

## 64. `/projects/:projectId` (`contracts`) — Visão do projeto

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts.png) · TV: sem captura.

- **Intenção:** abrir o workspace de um projeto.
- **Conceito:** overview com header de projeto, próximo trabalho e atividade.
- **Contexto/conteúdo esperado:** projeto `contracts`, backlog resumido, roadmap e atividade recente.
- **Pontos fortes:** rota mantém o contexto do projeto no URL e oferece fallback de workspace.
- **Pontos fracos:** a leitura de `agents` impede que o overview apareça.
- **Recomendação:** garantir que o header do projeto renderize antes das leituras secundárias e oferecer fallback para cada bloco.
- **Resultado observado real:** desktop/mobile HTTP 200 com heading “O workspace encontrou um estado inválido.” e `ENOENT` em `apps/contracts/.matriz/agents`.

## 65. `/projects/:projectId/roadmap` (`contracts`) — Roadmap estratégico

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--roadmap.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--roadmap.png) · TV: sem captura.

- **Intenção:** organizar fases, outcomes e iniciativas no tempo.
- **Conceito:** timeline trimestral com filtros e marcadores.
- **Contexto/conteúdo esperado:** fases, outcomes observáveis, iniciativas e períodos.
- **Pontos fortes:** timeline tem quarters, filtros Tipo/Estado, toggle “Exibir marcos” e CTA “Criar primeira fase”; empty state é orientado.
- **Pontos fracos:** captura mostra muitos controles para um estado sem dados; cabeçalho superior fica parcialmente comprimido no desktop.
- **Recomendação:** manter a estrutura, mas promover o empty state e reduzir controles desabilitados quando não há fases.
- **Resultado observado real:** HTTP 200, heading `contracts · Roadmap estratégico`; texto “0 iniciativas”, “0 marcadores” e “Defina a direção antes do calendário”; console 401.

## 66. `/projects/:projectId/backlog` (`contracts`) — Backlog do projeto

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--backlog.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--backlog.png) · TV: sem captura.

- **Intenção:** operar work items dentro do projeto.
- **Conceito:** board contextual com leitura de itens e inspector.
- **Contexto/conteúdo esperado:** itens, requests relacionados, evidências e seleção de item.
- **Pontos fortes:** desktop/mobile têm tratamento textual “O quadro não pôde ser carregado”/“FALHA DE LEITURA” e preservam a mensagem de arquivos locais.
- **Pontos fracos:** a captura final ainda depende de `agents` ausente e não mostra work items.
- **Recomendação:** padronizar o fallback server/client e tornar a ausência de `.matriz/agents` não fatal ao backlog.
- **Resultado observado real:** HTTP 200 em desktop/mobile, ambos com heading “O quadro não pôde ser carregado” e `ENOENT realpath 'apps/contracts/.matriz/agents'`; ambos têm fallback visível e não redirecionam.

## 67. `/projects/:projectId/backlog/:itemId` (`sample-item`) — Detalhe do item

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--backlog--sample-item.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--backlog--sample-item.png) · TV: sem captura.

- **Intenção:** revisar e operar um work item.
- **Conceito:** detalhe com estado, critérios, evidências e ações.
- **Contexto/conteúdo esperado:** `projectId` + `itemId` existentes.
- **Pontos fortes:** desktop comunica 404 com mensagem humana e link de retorno.
- **Pontos fracos:** fixture `sample-item` não existe; o detalhe não demonstra conteúdo de um item real.
- **Recomendação:** alinhar o tratamento do item inexistente entre server render e mobile hydration.
- **Resultado observado real:** desktop/mobile HTTP 200 com heading “Este item não existe.” e texto “Ele pode ter sido movido…”; não houve redirecionamento.

## 68. `/projects/:projectId/agents` (`contracts`) — Agentes

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--agents.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--agents.png) · TV: sem captura.

- **Intenção:** acompanhar solicitações e execuções de agentes.
- **Conceito:** índice de requests do projeto.
- **Contexto/conteúdo esperado:** requests, estado de execução, revisão e links para detalhes.
- **Pontos fortes:** rota dedicada separa coordenação de backlog e exibe fallback de estado inválido.
- **Pontos fracos:** nenhum request ou empty state é observável porque a pasta `agents` está ausente.
- **Recomendação:** renderizar header/empty state independentemente da leitura da pasta `agents`.
- **Resultado observado real:** desktop/mobile HTTP 200 com heading “O workspace encontrou um estado inválido.” e `ENOENT realpath 'apps/contracts/.matriz/agents'`.

## 69. `/projects/:projectId/agents/:requestId` (`sample-request`) — Detalhe do agente

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--agents--sample-request.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--agents--sample-request.png) · TV: sem captura.

- **Intenção:** revisar uma solicitação de agente específica.
- **Conceito:** detalhe de request, execução e aprovação.
- **Contexto/conteúdo esperado:** `requestId` existente em `contracts`.
- **Pontos fortes:** 404 é explícito, consistente e oferece “Voltar aos projetos”.
- **Pontos fracos:** o fixture é inválido e não há detalhe de request para avaliar.
- **Recomendação:** capturar com request real; manter o 404, mas evitar lookup de diretório ausente antes de validar o ID.
- **Resultado observado real:** desktop/mobile HTTP 200 com heading “Este item não existe.” e mensagem 404; não houve redirecionamento.

## 70. `/projects/:projectId/activity` (`contracts`) — Atividade

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--activity.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--activity.png) · TV: sem captura.

- **Intenção:** consultar o histórico append-only do projeto.
- **Conceito:** registro filtrável de decisões e mudanças.
- **Contexto/conteúdo esperado:** eventos, filtros, retenção e entidades relacionadas.
- **Pontos fortes:** heading `contracts` e descrição “Registro append-only consultável…” estabelecem o modelo; a navegação contextual fica visível.
- **Pontos fracos:** captura textual não mostra eventos concretos; pode parecer vazia sem uma indicação forte de “0 registros”.
- **Recomendação:** mostrar contagem/empty state explícito e manter filtros perto da timeline.
- **Resultado observado real:** HTTP 200, heading `contracts`; texto confirma registro append-only e visão de atividade; console 401; sem redirecionamento.

## 71. `/projects/:projectId/collaboration` (`contracts`) — Colaboração

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--collaboration.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--collaboration.png) · TV: sem captura.

- **Intenção:** preparar handoff curto entre pessoa, ChatGPT e Codex.
- **Conceito:** hub de colaboração por projeto.
- **Contexto/conteúdo esperado:** visão geral, roadmap, backlog, GitHub e alertas.
- **Pontos fortes:** texto “Uma passagem de bastão curta…” comunica benefício; tabs de Visão geral/Roadmap/Colaborar/Backlog/Docs/Decisões/Agentes/Atividade são abrangentes.
- **Pontos fracos:** muitas abas competem no desktop e exigem scroll no mobile; console 401 presente.
- **Recomendação:** agrupar navegação em “Trabalho”, “Conhecimento” e “Integrações” no mobile.
- **Resultado observado real:** HTTP 200, heading `contracts`; texto inclui “Uma passagem de bastão curta…”; console 401.

## 72. `/projects/:projectId/collaboration/github` (`contracts`) — Publicação GitHub

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--collaboration--github.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--collaboration--github.png) · TV: sem captura.

- **Intenção:** preparar drafts portáveis para publicação opcional no GitHub.
- **Conceito:** integração externa subordinada ao Git/local como fonte canônica.
- **Contexto/conteúdo esperado:** item, preview do corpo, copiar issue/Codex e URL de issue.
- **Pontos fortes:** título e subtítulo deixam a governança clara; card de issue tem ações explícitas e campo de vínculo.
- **Pontos fracos:** captura mostra um item de teste (`[contracts] teste`) e URL placeholder; no mobile o card é mais apertado.
- **Recomendação:** marcar fixtures de teste visualmente e validar o estado sem configuração GitHub antes de exibir ações.
- **Resultado observado real:** HTTP 200, heading `Publicação GitHub`; card com `TSK_A915E…`, ações “Copiar issue”/“Copiar para Codex + GitHub” e URL placeholder; console 401.

## 73. `/projects/:projectId/collaboration/notifications` (`contracts`) — Notificações

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--collaboration--notifications.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--collaboration--notifications.png) · TV: sem captura.

- **Intenção:** configurar a fila local de eventos e provedores opcionais.
- **Conceito:** outbox local desacoplado de integrações remotas.
- **Contexto/conteúdo esperado:** configuração, fila, status e ações de reenvio.
- **Pontos fortes:** texto “provedores continuam opcionais e desacoplados” reforça limite de segurança; rota contextual preserva o projeto.
- **Pontos fracos:** conteúdo textual não revela itens/contagens da fila; mobile tem pouco espaço para configuração.
- **Recomendação:** mostrar estado da outbox em primeiro plano e separar configuração de diagnóstico.
- **Resultado observado real:** HTTP 200, heading `contracts`; texto inclui “Fila local de eventos”; console 401; sem redirecionamento.

## 74. `/projects/:projectId/dependencies` (`contracts`) — Dependências

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--dependencies.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--dependencies.png) · TV: sem captura.

- **Intenção:** montar o mapa de dependências do trabalho.
- **Conceito:** visualização de relações persistidas entre itens/requests.
- **Contexto/conteúdo esperado:** grafo/lista, seleção de item e evidências relacionadas.
- **Pontos fortes:** fallback explica “Os arquivos permanecem intactos” e oferece tentativa de releitura.
- **Pontos fracos:** mapa não carrega por diretório ausente; nenhuma relação é visualizada.
- **Recomendação:** degradar para mapa parcial e distinguir “sem dependências” de “falha de leitura”.
- **Resultado observado real:** HTTP 200, heading “Não foi possível montar o mapa”; `ENOENT realpath 'apps/contracts/.matriz/agents'`; desktop/mobile têm fallback, console 401.

## 75. `/projects/:projectId/decisions` (`contracts`) — Decisões

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--decisions.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--decisions.png) · TV: sem captura.

- **Intenção:** consultar decisões técnicas curtas e revisáveis.
- **Conceito:** índice de documentos do tipo decisão.
- **Contexto/conteúdo esperado:** lista de decisões e link para Docs.
- **Pontos fortes:** fallback de erro é consistente entre viewports e não oculta a falha.
- **Pontos fracos:** a leitura do diretório `docs` impede até o empty state; desktop/mobile não oferecem índice.
- **Recomendação:** tratar docs ausente como “nenhuma decisão / workspace não inicializado”, com CTA para Docs.
- **Resultado observado real:** HTTP 200; ambos mostram estado inválido com `ENOENT realpath 'apps/contracts/.matriz/docs'`; heading mobile explícito, desktop também no texto; console 401.

## 76. `/projects/:projectId/docs` (`contracts`) — Documentos

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--docs.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--docs.png) · TV: sem captura.

- **Intenção:** navegar pelo conhecimento Markdown do projeto.
- **Conceito:** catálogo de documentos próximo ao código e versionado pelo Git.
- **Contexto/conteúdo esperado:** documentos por tipo, slug e formulário de criação.
- **Pontos fortes:** fallback comunica erro em linguagem de workspace.
- **Pontos fracos:** `docs` ausente derruba a tela; não é possível avaliar a lista, busca ou criação visual.
- **Recomendação:** renderizar cabeçalho e CTA mesmo sem diretório; mostrar “workspace ainda não inicializado”.
- **Resultado observado real:** HTTP 200, estado inválido em desktop/mobile, `ENOENT realpath 'apps/contracts/.matriz/docs'`; console 401.

## 77. `/projects/:projectId/docs/:kind/:slug` (`product/overview`) — Documento

Capturas: [desktop](../output/visual-route-audit/matriz-workbench/desktop/projects--contracts--docs--product--overview.png) · [mobile](../output/visual-route-audit/matriz-workbench/mobile/projects--contracts--docs--product--overview.png) · TV: sem captura.

- **Intenção:** ler/editar um documento específico.
- **Conceito:** detalhe Markdown por tipo e slug.
- **Contexto/conteúdo esperado:** `projectId`, `kind=product` e `slug=overview` existentes.
- **Pontos fortes:** 404 usa mensagem humana e retorno aos projetos.
- **Pontos fracos:** fixture não existe; a captura não demonstra leitura, edição ou revisão do Markdown.
- **Recomendação:** usar um documento real no roteiro; manter o 404, mas validar `kind/slug` antes das leituras de diretório.
- **Resultado observado real:** HTTP 200 com heading “Este item não existe.” em desktop/mobile e texto “Ele pode ter sido movido…”; console mobile 401; sem redirecionamento.

## Síntese da evidência

- **Conteúdo visualmente utilizável:** `/knowledge`, `/praticies`, `/projects`,
  `/projects/new`, `/projects/contracts/activity`, `/projects/contracts/roadmap`,
  `/projects/contracts/collaboration`, `/projects/contracts/collaboration/github`,
  `/projects/contracts/collaboration/notifications`, `/sites`, `/settings`,
  `/work/inbox` e `/unlock`.
- **Estado de erro/fallback observado:** `/`, `/control`, `/projects/contracts`,
  `/projects/contracts/agents`, `/work/backlog`,
  `/work/sprints`, `/work/sprints/sample-sprint`, `/projects/contracts/backlog`,
  `/projects/contracts/backlog/sample-item`, `/projects/contracts/agents/sample-request`,
  `/projects/contracts/dependencies`, `/projects/contracts/decisions`,
  `/projects/contracts/docs` e `/projects/contracts/docs/product/overview`.
- **404/ID ou fonte inválida:** `/knowledge/matriz-infra-hub`,
  `/projects/contracts/agents/sample-request`, `/projects/contracts/backlog/sample-item`
  e `/projects/contracts/docs/product/overview`.
- **TV:** somente `/` e `/control` foram capturadas; ambas estão em estado inválido.
  A captura final não fornece evidência de uma rota TV funcional nesta rodada.


---

Fonte: `output/visual-route-audit/capture-results.json` final e capturas associadas. “Esperado” vem do componente da rota; “observado” limita-se à captura. Todas as rotas mantiveram a URL solicitada, responderam `200` e não apresentaram redirecionamento observado.

## Contracts

### 78. Dashboard de contratos (`/`)
Desktop: [captura](../output/visual-route-audit/contracts/desktop/home.png) · Mobile: [captura](../output/visual-route-audit/contracts/mobile/home.png) · TV: não capturada.

- Intenção: resumir a operação documental.
- Conceito: métricas de status e contratos recentes.
- Contexto/conteúdo esperado: contadores e lista do tenant atual.
- Pontos fortes: cards e lista são claros; mobile preserva a hierarquia.
- Pontos fracos: banner Aurora compete com o conteúdo no canto inferior.
- Recomendação: recolher/adiar recomendação de tema durante tarefas.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3003/`, heading “Dashboard de contratos”; sem redirecionamento, contadores e dois contratos renderizados.

### 79. Contratos (`/contracts`)
Desktop: [captura](../output/visual-route-audit/contracts/desktop/contracts.png) · Mobile: [captura](../output/visual-route-audit/contracts/mobile/contracts.png) · TV: [captura](../output/visual-route-audit/contracts/tv/contracts.png).

- Intenção: consultar contratos existentes.
- Conceito: lista de cards com origem, valor, vigência e status.
- Contexto/conteúdo esperado: contratos do tenant Acme.
- Pontos fortes: navegação local direta; UI final também foi capturada em TV.
- Pontos fracos: banner Aurora sobrepõe a área inferior.
- Recomendação: mover a recomendação para configuração de tema.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://localhost:3003/contracts`, heading “Contratos”; sem redirecionamento, lista visível.

### 80. Templates (`/templates`)
Desktop: [captura](../output/visual-route-audit/contracts/desktop/templates.png) · Mobile: [captura](../output/visual-route-audit/contracts/mobile/templates.png) · TV: não capturada.

- Intenção: expor modelos de contrato.
- Conceito: cards de template com estado e categoria.
- Contexto/conteúdo esperado: templates mock ativos/inativos.
- Pontos fortes: separa configuração documental de contratos.
- Pontos fracos: não há evidência TV da densidade dos metadados.
- Recomendação: incluir a rota em rodada TV se templates forem operados à distância.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3003/templates`, heading “Templates”; sem redirecionamento, modelos renderizados.

### 81. Onboarding (`/onboarding`)
Desktop: [captura](../output/visual-route-audit/contracts/desktop/onboarding.png) · Mobile: [captura](../output/visual-route-audit/contracts/mobile/onboarding.png) · TV: não capturada.

- Intenção: orientar configuração documental.
- Conceito: passos compartilhados e extensão Contracts.
- Contexto/conteúdo esperado: sequência global e etapa de templates/assinaturas.
- Pontos fortes: vínculo entre fluxo comum e app é explícito.
- Pontos fracos: texto informativo é longo e não há TV.
- Recomendação: destacar a etapa específica antes da explicação.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3003/onboarding`, heading “Onboarding - Contracts”; sem redirecionamento, passos renderizados.

### 82. Login (`/login`)
Desktop: [captura](../output/visual-route-audit/contracts/desktop/login.png) · Mobile: [captura](../output/visual-route-audit/contracts/mobile/login.png) · TV: [captura](../output/visual-route-audit/contracts/tv/login.png).

- Intenção: autenticar no app documental.
- Conceito: hero editorial escuro e formulário claro de magic link.
- Contexto/conteúdo esperado: magic link principal e alternativas.
- Pontos fortes: marca, proposta e CTA são legíveis; azul conecta painéis.
- Pontos fracos: quatro métodos dividem atenção; hero é amplo em desktop/TV.
- Recomendação: tornar magic link a única ação inicial.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://localhost:3003/login`, heading “Cada compromisso começa com contexto.”; sem redirecionamento.

## Seumei

### 83. Seumei (`/`)
Desktop: [captura](../output/visual-route-audit/seumei/desktop/home.png) · Mobile: [captura](../output/visual-route-audit/seumei/mobile/home.png) · TV: não capturada.

- Intenção: resumir a operação de estabelecimentos.
- Conceito: métricas, próximos locais e integração.
- Contexto/conteúdo esperado: estabelecimentos, ativos e rascunhos.
- Pontos fortes: shell e dashboard finais renderizaram.
- Pontos fracos: descrição longa do produto fragmenta navegação mobile.
- Recomendação: encurtar/ocultar descrição em telas pequenas.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3002/`, heading “Seumei”; sem redirecionamento, dashboard autenticado visível.

### 84. Estabelecimentos (`/establishments`)
Desktop: [captura](../output/visual-route-audit/seumei/desktop/establishments.png) · Mobile: [captura](../output/visual-route-audit/seumei/mobile/establishments.png) · TV: [captura](../output/visual-route-audit/seumei/tv/establishments.png).

- Intenção: gerir locais e iniciar geração de contrato.
- Conceito: listagem de cards ou estado vazio.
- Contexto/conteúdo esperado: estabelecimentos do tenant e ações de contrato.
- Pontos fortes: empty state explícito e bem centralizado; TV renderizou.
- Pontos fracos: falta CTA de cadastro; header mobile quebra em coluna estreita.
- Recomendação: incluir “Cadastrar estabelecimento” e compactar o header mobile.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://localhost:3002/establishments`, heading “Estabelecimentos”; sem redirecionamento, estado “Nenhum estabelecimento” visível.

### 85. Proprietários (`/owners`)
Desktop: [captura](../output/visual-route-audit/seumei/desktop/owners.png) · Mobile: [captura](../output/visual-route-audit/seumei/mobile/owners.png) · TV: não capturada.

- Intenção: consultar perfis de proprietários.
- Conceito: cards de contato associados aos estabelecimentos.
- Contexto/conteúdo esperado: perfis ou estado vazio.
- Pontos fortes: título e shell de domínio são claros.
- Pontos fracos: inventário vazio limita a avaliação de cards.
- Recomendação: no empty state, apontar para Estabelecimentos.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3002/owners`, heading “Proprietários”; sem redirecionamento, rota final renderizada.

### 86. Onboarding (`/onboarding`)
Desktop: [captura](../output/visual-route-audit/seumei/desktop/onboarding.png) · Mobile: [captura](../output/visual-route-audit/seumei/mobile/onboarding.png) · TV: não capturada.

- Intenção: explicar etapas globais e operação específica.
- Conceito: passos compartilhados e extensão de estabelecimento/região.
- Contexto/conteúdo esperado: sequência global e passo do bootstrap.
- Pontos fortes: contexto do ecossistema e etapa local são explícitos.
- Pontos fracos: texto auxiliar vem antes da decisão principal.
- Recomendação: tornar a etapa específica um bloco acionável.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3002/onboarding`, heading “Onboarding (Seu Mei)”; sem redirecionamento, conteúdo final renderizado.

### 87. Login (`/login`)
Desktop: [captura](../output/visual-route-audit/seumei/desktop/login.png) · Mobile: [captura](../output/visual-route-audit/seumei/mobile/login.png) · TV: [captura](../output/visual-route-audit/seumei/tv/login.png).

- Intenção: autenticar para operação de estabelecimentos.
- Conceito: landing dividida verde com OTP dominante.
- Contexto/conteúdo esperado: envio de código mock e alternativas.
- Pontos fortes: cor e mensagem são coerentes; CTA de código é inequívoco.
- Pontos fracos: alternativas têm peso visual próximo ao OTP.
- Recomendação: priorizar OTP e deslocar alternativas para segundo nível.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://localhost:3002/login`, heading “Seu negócio aberto para o que vem.”; sem redirecionamento.

## Sites

### 88. Catálogo (`/`)
Desktop: [captura](../output/visual-route-audit/sites/desktop/home.png) · Mobile: [captura](../output/visual-route-audit/sites/mobile/home.png) · TV: [captura](../output/visual-route-audit/sites/tv/home.png).

- Intenção: apresentar sites configuráveis.
- Conceito: composição editorial, contador e linha de catálogo.
- Contexto/conteúdo esperado: Site Exemplo, locales, assets e preview.
- Pontos fortes: hierarquia tipográfica excelente; atributos escaneáveis; três viewports cobertos.
- Pontos fracos: contador “01” concorre com a linha do catálogo; console registra 404/401.
- Recomendação: reduzir a dominância do contador e investigar os requests.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://127.0.0.1:3006/`, heading “Um runtime. Muitas identidades.”; sem redirecionamento.

### 89. Preview do exemplo (`/preview/example/pt-BR`)
Desktop: [captura](../output/visual-route-audit/sites/desktop/preview--example--pt-BR.png) · Mobile: [captura](../output/visual-route-audit/sites/mobile/preview--example--pt-BR.png) · TV: [captura](../output/visual-route-audit/sites/tv/preview--example--pt-BR.png).

- Intenção: renderizar site configurado por dados e locale.
- Conceito: hero de marketing, troca de idioma e trilha de construção.
- Contexto/conteúdo esperado: Site Exemplo em `pt-BR`, com opção `en`.
- Pontos fortes: headline e trilha explicam o produto com economia; locale é visível.
- Pontos fracos: título ocupa altura excessiva; navegação é sutil diante do hero.
- Recomendação: limitar heading e elevar navegação para TV.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://127.0.0.1:3006/preview/example/pt-BR`, heading “Sites consistentes sem recomeçar do zero.”; sem redirecionamento.

## Spot

### 90. Spot (`/`)
Desktop: [captura](../output/visual-route-audit/spot/desktop/home.png) · Mobile: [captura](../output/visual-route-audit/spot/mobile/home.png) · TV: não capturada.

- Intenção: resumir gigs, status e bandas.
- Conceito: métricas e próximas gigs.
- Contexto/conteúdo esperado: dados do tenant autenticado e gestão.
- Pontos fortes: shell e dashboard finais renderizaram.
- Pontos fracos: texto de propósito toma área demais no header mobile.
- Recomendação: trocar o texto por etiqueta curta em mobile.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3001/`, heading “Spot”; sem redirecionamento, dashboard autenticado visível.

### 91. Gigs (`/gigs`)
Desktop: [captura](../output/visual-route-audit/spot/desktop/gigs.png) · Mobile: [captura](../output/visual-route-audit/spot/mobile/gigs.png) · TV: [captura](../output/visual-route-audit/spot/tv/gigs.png).

- Intenção: gerir gigs e solicitar contratos.
- Conceito: cards de gig ou estado vazio.
- Contexto/conteúdo esperado: gigs e ações de publicar/contrato.
- Pontos fortes: empty state compreensível e rota TV concluída.
- Pontos fracos: falta CTA de criação; header mobile fica excessivamente alto.
- Recomendação: incluir “Criar gig” e compactar o header.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://localhost:3001/gigs`, heading “Gigs”; sem redirecionamento, estado “Nenhuma gig cadastrada” visível.

### 92. Bandas (`/bands`)
Desktop: [captura](../output/visual-route-audit/spot/desktop/bands.png) · Mobile: [captura](../output/visual-route-audit/spot/mobile/bands.png) · TV: não capturada.

- Intenção: consultar bandas e perfis artísticos.
- Conceito: cards com gênero, localidade e rider.
- Contexto/conteúdo esperado: bandas do tenant ou lista vazia.
- Pontos fortes: título e navegação de domínio são claros.
- Pontos fracos: o tenant capturado não expõe lista para avaliar cards/badges.
- Recomendação: capturar um tenant com bandas para revisar a listagem.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3001/bands`, heading “Bandas”; sem redirecionamento, rota final renderizada.

### 93. Onboarding (`/onboarding`)
Desktop: [captura](../output/visual-route-audit/spot/desktop/onboarding.png) · Mobile: [captura](../output/visual-route-audit/spot/mobile/onboarding.png) · TV: não capturada.

- Intenção: apresentar onboarding comum e perfil artístico.
- Conceito: passos globais e extensão local.
- Contexto/conteúdo esperado: sequência e etapa específica do Spot.
- Pontos fortes: relação com Hub é legível; desktop/mobile renderizaram.
- Pontos fracos: header mobile comprime navegação antes do conteúdo.
- Recomendação: aplicar padrão de header compacto em Spot.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3001/onboarding`, heading “Onboarding (Spot)”; sem redirecionamento, passos renderizados.

### 94. Login (`/login`)
Desktop: [captura](../output/visual-route-audit/spot/desktop/login.png) · Mobile: [captura](../output/visual-route-audit/spot/mobile/login.png) · TV: [captura](../output/visual-route-audit/spot/tv/login.png).

- Intenção: autenticar para artistas e gigs.
- Conceito: landing âmbar/preto com OTP.
- Contexto/conteúdo esperado: código mock prioritário e alternativas.
- Pontos fortes: identidade energética; caminho de ação nítido.
- Pontos fracos: quatro métodos aumentam a decisão inicial; hero extenso para recorrentes.
- Recomendação: revelar alternativas sob demanda e compactar desktop/TV.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://localhost:3001/login`, heading “O próximo show começa aqui.”; sem redirecionamento.

## WillDash

### 95. Overview (`/`)
Desktop: [captura](../output/visual-route-audit/willdash/desktop/home.png) · Mobile: [captura](../output/visual-route-audit/willdash/mobile/home.png) · TV: não capturada.

- Intenção: agregar eventos do ecossistema.
- Conceito: cards por app ou estado vazio.
- Contexto/conteúdo esperado: agregação em tempo real.
- Pontos fortes: empty state explica como preencher a tela.
- Pontos fracos: não há ação direta para chegar ao evento produtor.
- Recomendação: incluir link contextual para Spot/Seumei ou telemetria.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3004/`, heading “Overview”; sem redirecionamento, “Nenhum evento ainda” visível.

### 96. Metas (`/goals`)
Desktop: [captura](../output/visual-route-audit/willdash/desktop/goals.png) · Mobile: [captura](../output/visual-route-audit/willdash/mobile/goals.png) · TV: [captura](../output/visual-route-audit/willdash/tv/goals.png).

- Intenção: acompanhar e atualizar metas.
- Conceito: cards de progresso, prazo, status e sessão.
- Contexto/conteúdo esperado: metas de shows e onboarding.
- Pontos fortes: cards completos, CTAs nítidos e boa transposição mobile; TV capturada.
- Pontos fracos: cards muito largos no desktop diluem relação meta/ação.
- Recomendação: limitar largura de leitura ou usar grade.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://localhost:3004/goals`, heading “Metas”; sem redirecionamento, duas metas renderizadas.

### 97. Atividades (`/activities`)
Desktop: [captura](../output/visual-route-audit/willdash/desktop/activities.png) · Mobile: [captura](../output/visual-route-audit/willdash/mobile/activities.png) · TV: não capturada.

- Intenção: mostrar timeline de atividades.
- Conceito: cards cronológicos com tipo, nota, valor e meta.
- Contexto/conteúdo esperado: check-ins e milestones mock.
- Pontos fortes: texto confirma ordenação temporal e distinção por tipo.
- Pontos fracos: IDs de meta aparecem como texto técnico.
- Recomendação: mostrar nome de meta e relegar ID ao detalhe.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3004/activities`, heading “Atividades”; sem redirecionamento, timeline renderizada.

### 98. Dashboards (`/dashboards`)
Desktop: [captura](../output/visual-route-audit/willdash/desktop/dashboards.png) · Mobile: [captura](../output/visual-route-audit/willdash/mobile/dashboards.png) · TV: não capturada.

- Intenção: listar dashboards por tenant.
- Conceito: cards e widgets de observabilidade.
- Contexto/conteúdo esperado: dashboards operacional e onboarding.
- Pontos fortes: conteúdo distingue dashboard, widget, app e métrica.
- Pontos fracos: metadados técnicos podem reduzir escaneabilidade em telas menores.
- Recomendação: testar TV e dar maior peso ao nome do widget.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3004/dashboards`, heading “Dashboards”; sem redirecionamento, dashboards mock renderizados.

### 99. Telemetria bruta (`/telemetry`)
Desktop: [captura](../output/visual-route-audit/willdash/desktop/telemetry.png) · Mobile: [captura](../output/visual-route-audit/willdash/mobile/telemetry.png) · TV: não capturada.

- Intenção: inspecionar envelopes do EventBus.
- Conceito: timeline reversa ou empty state.
- Contexto/conteúdo esperado: origem, timestamp e payload JSON.
- Pontos fortes: empty state instrui como produzir dados.
- Pontos fracos: não há link para essa interação e falta evidência TV para JSON longo.
- Recomendação: ligar estado vazio aos produtores e capturar TV com eventos.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3004/telemetry`, heading “Telemetria bruta”; sem redirecionamento, “Nenhum evento registrado” visível.

### 100. Onboarding (`/onboarding`)
Desktop: [captura](../output/visual-route-audit/willdash/desktop/onboarding.png) · Mobile: [captura](../output/visual-route-audit/willdash/mobile/onboarding.png) · TV: não capturada.

- Intenção: introduzir preferências de metas/dashboards.
- Conceito: passos compartilhados e extensão WillDash.
- Contexto/conteúdo esperado: sequência global e preferência específica.
- Pontos fortes: explica papel observador do app e sua extensão.
- Pontos fracos: prioridade visual entre explicação e próximo passo é sutil.
- Recomendação: destacar a preferência específica como ação principal.
- Resultado observado real: desktop/mobile `200`, finalUrl `http://localhost:3004/onboarding`, heading “Onboarding - Willdash”; sem redirecionamento, passos renderizados.

### 101. Login (`/login`)
Desktop: [captura](../output/visual-route-audit/willdash/desktop/login.png) · Mobile: [captura](../output/visual-route-audit/willdash/mobile/login.png) · TV: [captura](../output/visual-route-audit/willdash/tv/login.png).

- Intenção: autenticar no dashboard de metas/sinais.
- Conceito: landing vinho/magenta e formulário de magic link.
- Contexto/conteúdo esperado: magic link prioritário e alternativas.
- Pontos fortes: identidade própria, CTA claro e mensagem analítica consistente.
- Pontos fracos: headline quebra em muitas linhas e métodos disputam atenção.
- Recomendação: conter headline e reduzir primazia das opções secundárias.
- Resultado observado real: desktop/mobile/TV `200`, finalUrl `http://localhost:3004/login`, heading “Decida olhando para o que mudou.”; sem redirecionamento.

## Contagem

| Item | Quantidade |
| --- | ---: |
| Rotas O01–O24 auditadas | 24 |
| Capturas desktop/mobile analisadas | 48 |
| Capturas TV disponíveis | 10 |
| Rotas com UI final visível | 24 |
| Respostas 200 | 24 |
| Redirecionamentos observados | 0 |

Nota literal de `finalUrl`: os apps autenticados usaram `localhost`; Sites usou `127.0.0.1`.


---

## Regra de qualificação

Um item só é **qualificado** depois de dois consumidores reais, independentes e comprovados por `rg` no repositório. Antes disso, seu status é obrigatoriamente **backlog de validação** — mesmo que tenha export no package ou pareça reutilizável.

Gate obrigatório antes de mover qualquer código para `@matriz/design-ui`:

1. Registrar dois imports/usos reais em apps distintos (arquivo e export identificáveis por `rg`).
2. Confirmar superfície estável somente de props visuais/comportamentais.
3. Confirmar que não carrega domínio, entidades, repositórios, sessão, tenant, router, registry ou eventos.
4. Criar/adaptar o export no package e validar os dois consumidores.

Esta versão remove pares rotativos hipotéticos. Evidência de consumo abaixo vem de `rg -l '@matriz/design-ui' apps/contracts apps/seumei apps/sites apps/spot apps/willdash` seguido de busca do identificador; exports foram verificados em `packages/design/ui/src`.

## Inventário C001–C100

- **C001 — Stack** — evidência real: export `Stack` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: estrutura, tokens e children; sem rota, dados ou domínio.
- **C002 — Inline** — evidência real: export `Inline` em `packages/design/ui/src`; `rg` não comprovou dois consumidores reais nos cinco apps auditados.; estágio: **export existente**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: estrutura, tokens e children; sem rota, dados ou domínio.
- **C003 — Container** — evidência real: export `Container` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: estrutura, tokens e children; sem rota, dados ou domínio.
- **C004 — Surface** — evidência real: export `Surface` em `packages/design/ui/src`; `rg` encontrou uso em apps/seumei, apps/spot.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/seumei, apps/spot.; limite de domínio: estrutura, tokens e children; sem rota, dados ou domínio.
- **C005 — Card** — evidência real: export `Card` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: estrutura, tokens e children; sem rota, dados ou domínio.
- **C006 — CardHeader** — evidência real: export `CardHeader` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: estrutura, tokens e children; sem rota, dados ou domínio.
- **C007 — CardTitle** — evidência real: export `CardTitle` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: estrutura, tokens e children; sem rota, dados ou domínio.
- **C008 — CardDescription** — evidência real: export `CardDescription` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: estrutura, tokens e children; sem rota, dados ou domínio.
- **C009 — Heading** — evidência real: export `Heading` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: tipografia/ação visual; sem regra de negócio.
- **C010 — Text** — evidência real: export `Text` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: tipografia/ação visual; sem regra de negócio.
- **C011 — Button** — evidência real: export `Button` em `packages/design/ui/src`; `rg` encontrou uso em apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/seumei, apps/spot, apps/willdash.; limite de domínio: tipografia/ação visual; sem regra de negócio.
- **C012 — Label** — evidência real: export `Label` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/sites, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/sites, apps/spot, apps/willdash.; limite de domínio: semântica de campo e interação local; sem submit, auth ou persistência.
- **C013 — Input** — evidência real: export `Input` em `packages/design/ui/src`; `rg` encontrou uso em apps/seumei, apps/spot.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/seumei, apps/spot.; limite de domínio: semântica de campo e interação local; sem submit, auth ou persistência.
- **C014 — FormField** — evidência real: export `FormField` em `packages/design/ui/src`; `rg` não comprovou dois consumidores reais nos cinco apps auditados.; estágio: **export existente**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: semântica de campo e interação local; sem submit, auth ou persistência.
- **C015 — Badge** — evidência real: export `Badge` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: apresentação de estado recebido por props; sem decidir regra.
- **C016 — Alert** — evidência real: export `Alert` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: apresentação de estado recebido por props; sem decidir regra.
- **C017 — EmptyState** — evidência real: export `EmptyState` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/spot, apps/willdash.; limite de domínio: apresentação de estado recebido por props; sem decidir regra.
- **C018 — InfoHint** — evidência real: export `InfoHint` em `packages/design/ui/src`; `rg` não comprovou dois consumidores reais nos cinco apps auditados.; estágio: **export existente**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: apresentação de estado recebido por props; sem decidir regra.
- **C019 — ThemeController** — evidência real: export `ThemeController` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/sites, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/sites, apps/spot, apps/willdash.; limite de domínio: composição e tema por props; sem sessão, registry ou autorização.
- **C020 — ThemeToggle** — evidência real: export `ThemeToggle` em `packages/design/ui/src`; `rg` encontrou uso em apps/contracts, apps/seumei, apps/sites, apps/spot, apps/willdash.; estágio: **export existente**; status de qualificação: **qualificado**; possíveis consumidores: consumidores comprovados: apps/contracts, apps/seumei, apps/sites, apps/spot, apps/willdash.; limite de domínio: composição e tema por props; sem sessão, registry ou autorização.
- **C021 — MatrizAuthLayout** — evidência real: export `MatrizAuthLayout` em `packages/design/ui/src`; `rg` não comprovou dois consumidores reais nos cinco apps auditados.; estágio: **export existente**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: telas de login de Contracts, Seumei, Spot e WillDash; ainda usam LoginScreen local/flow compartilhado.; limite de domínio: composição e tema por props; sem sessão, registry ou autorização.
- **C022 — EcosystemBar** — evidência real: export `EcosystemBar` em `packages/design/ui/src`; `rg` não comprovou dois consumidores reais nos cinco apps auditados.; estágio: **export existente**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells locais de Contracts, Seumei, Spot e WillDash; validar sem acoplar registry.; limite de domínio: composição e tema por props; sem sessão, registry ou autorização.
- **C023 — PageHeader** — evidência real: `rg` não encontrou export `PageHeader` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C024 — SectionHeader** — evidência real: `rg` não encontrou export `SectionHeader` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C025 — Toolbar** — evidência real: `rg` não encontrou export `Toolbar` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C026 — Breadcrumbs** — evidência real: `rg` não encontrou export `Breadcrumbs` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C027 — Tabs** — evidência real: `rg` não encontrou export `Tabs` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C028 — TabList** — evidência real: `rg` não encontrou export `TabList` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C029 — Tab** — evidência real: `rg` não encontrou export `Tab` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C030 — LinkButton** — evidência real: `rg` não encontrou export `LinkButton` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C031 — IconButton** — evidência real: `rg` não encontrou export `IconButton` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C032 — ButtonGroup** — evidência real: `rg` não encontrou export `ButtonGroup` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C033 — MenuButton** — evidência real: `rg` não encontrou export `MenuButton` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C034 — ActionMenu** — evidência real: `rg` não encontrou export `ActionMenu` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: shells e rotas autenticadas de Contracts, Seumei, Spot ou WillDash; falta segundo uso equivalente.; limite de domínio: navegação visual por itens/links fornecidos; sem router ou permissões.
- **C035 — SearchField** — evidência real: `rg` não encontrou export `SearchField` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C036 — SelectField** — evidência real: `rg` não encontrou export `SelectField` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C037 — TextareaField** — evidência real: `rg` não encontrou export `TextareaField` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C038 — CheckboxField** — evidência real: `rg` não encontrou export `CheckboxField` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C039 — RadioGroup** — evidência real: `rg` não encontrou export `RadioGroup` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C040 — Switch** — evidência real: `rg` não encontrou export `Switch` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C041 — FormActions** — evidência real: `rg` não encontrou export `FormActions` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C042 — Fieldset** — evidência real: `rg` não encontrou export `Fieldset` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C043 — InlineError** — evidência real: `rg` não encontrou export `InlineError` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C044 — ValidationSummary** — evidência real: `rg` não encontrou export `ValidationSummary` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: fluxos de login e ações locais; falta caso real independente.; limite de domínio: campo/validação visual; sem schema de produto, submit ou API.
- **C045 — Notice** — evidência real: `rg` não encontrou export `Notice` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C046 — StatusPill** — evidência real: `rg` não encontrou export `StatusPill` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C047 — StatusDot** — evidência real: `rg` não encontrou export `StatusDot` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C048 — ProgressBar** — evidência real: `rg` não encontrou export `ProgressBar` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C049 — Skeleton** — evidência real: `rg` não encontrou export `Skeleton` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C050 — Spinner** — evidência real: `rg` não encontrou export `Spinner` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C051 — LoadingBoundary** — evidência real: `rg` não encontrou export `LoadingBoundary` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C052 — ErrorState** — evidência real: `rg` não encontrou export `ErrorState` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C053 — NotFoundState** — evidência real: `rg` não encontrou export `NotFoundState` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C054 — RetryButton** — evidência real: `rg` não encontrou export `RetryButton` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: estados vazios/feedback nas rotas /gigs, /establishments, /telemetry; falta segundo uso do mesmo componente.; limite de domínio: feedback e estado de UI; sem retries, fetch ou domínio.
- **C055 — ConfirmDialog** — evidência real: `rg` não encontrou export `ConfirmDialog` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: ações de gig, estabelecimento ou meta; falta caso real independente.; limite de domínio: foco, abertura e composição local; sem ação de domínio.
- **C056 — Drawer** — evidência real: `rg` não encontrou export `Drawer` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: ações de gig, estabelecimento ou meta; falta caso real independente.; limite de domínio: foco, abertura e composição local; sem ação de domínio.
- **C057 — Dialog** — evidência real: `rg` não encontrou export `Dialog` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: ações de gig, estabelecimento ou meta; falta caso real independente.; limite de domínio: foco, abertura e composição local; sem ação de domínio.
- **C058 — Popover** — evidência real: `rg` não encontrou export `Popover` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: ações de gig, estabelecimento ou meta; falta caso real independente.; limite de domínio: foco, abertura e composição local; sem ação de domínio.
- **C059 — Tooltip** — evidência real: `rg` não encontrou export `Tooltip` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: ações de gig, estabelecimento ou meta; falta caso real independente.; limite de domínio: foco, abertura e composição local; sem ação de domínio.
- **C060 — DataTable** — evidência real: `rg` não encontrou export `DataTable` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C061 — TableToolbar** — evidência real: `rg` não encontrou export `TableToolbar` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C062 — TablePagination** — evidência real: `rg` não encontrou export `TablePagination` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C063 — SortButton** — evidência real: `rg` não encontrou export `SortButton` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C064 — FilterChip** — evidência real: `rg` não encontrou export `FilterChip` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C065 — FilterBar** — evidência real: `rg` não encontrou export `FilterBar` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C066 — List** — evidência real: `rg` não encontrou export `List` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C067 — ListItem** — evidência real: `rg` não encontrou export `ListItem` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C068 — EntityRow** — evidência real: `rg` não encontrou export `EntityRow` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C069 — EntityIdentity** — evidência real: `rg` não encontrou export `EntityIdentity` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C070 — EntityMeta** — evidência real: `rg` não encontrou export `EntityMeta` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C071 — EntityActions** — evidência real: `rg` não encontrou export `EntityActions` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: listas de contratos, metas e atividades; não há componente comum comprovado.; limite de domínio: renderização de view models; sem entidades, repositórios ou busca.
- **C072 — MetricCard** — evidência real: `rg` não encontrou export `MetricCard` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C073 — MetricGrid** — evidência real: `rg` não encontrou export `MetricGrid` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C074 — Stat** — evidência real: `rg` não encontrou export `Stat` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C075 — KpiDelta** — evidência real: `rg` não encontrou export `KpiDelta` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C076 — Timeline** — evidência real: `rg` não encontrou export `Timeline` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C077 — TimelineItem** — evidência real: `rg` não encontrou export `TimelineItem` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C078 — ActivityFeed** — evidência real: `rg` não encontrou export `ActivityFeed` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C079 — EventRow** — evidência real: `rg` não encontrou export `EventRow` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C080 — AuditLog** — evidência real: `rg` não encontrou export `AuditLog` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: overview, metas, atividades e telemetria do WillDash; não há segundo consumidor comprovado.; limite de domínio: métricas/eventos já preparados; sem telemetria ou regra de produto.
- **C081 — EmptyTable** — evidência real: `rg` não encontrou export `EmptyTable` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: layouts e shells de apps; falta padrão igual em dois consumidores.; limite de domínio: layout/navegação por props; sem conhecimento de app.
- **C082 — CardGrid** — evidência real: `rg` não encontrou export `CardGrid` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: layouts e shells de apps; falta padrão igual em dois consumidores.; limite de domínio: layout/navegação por props; sem conhecimento de app.
- **C083 — ResponsiveGrid** — evidência real: `rg` não encontrou export `ResponsiveGrid` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: layouts e shells de apps; falta padrão igual em dois consumidores.; limite de domínio: layout/navegação por props; sem conhecimento de app.
- **C084 — SplitPane** — evidência real: `rg` não encontrou export `SplitPane` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: layouts e shells de apps; falta padrão igual em dois consumidores.; limite de domínio: layout/navegação por props; sem conhecimento de app.
- **C085 — SideNav** — evidência real: `rg` não encontrou export `SideNav` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: layouts e shells de apps; falta padrão igual em dois consumidores.; limite de domínio: layout/navegação por props; sem conhecimento de app.
- **C086 — TopNav** — evidência real: `rg` não encontrou export `TopNav` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: layouts e shells de apps; falta padrão igual em dois consumidores.; limite de domínio: layout/navegação por props; sem conhecimento de app.
- **C087 — CommandPalette** — evidência real: `rg` não encontrou export `CommandPalette` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: qualquer rota acessível; não há export/uso concreto com este nome.; limite de domínio: acessibilidade/utilitário visual; sem estado de produto.
- **C088 — SkipLink** — evidência real: `rg` não encontrou export `SkipLink` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: qualquer rota acessível; não há export/uso concreto com este nome.; limite de domínio: acessibilidade/utilitário visual; sem estado de produto.
- **C089 — FocusTrap** — evidência real: `rg` não encontrou export `FocusTrap` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: qualquer rota acessível; não há export/uso concreto com este nome.; limite de domínio: acessibilidade/utilitário visual; sem estado de produto.
- **C090 — VisuallyHidden** — evidência real: `rg` não encontrou export `VisuallyHidden` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: qualquer rota acessível; não há export/uso concreto com este nome.; limite de domínio: acessibilidade/utilitário visual; sem estado de produto.
- **C091 — LiveRegion** — evidência real: `rg` não encontrou export `LiveRegion` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: qualquer rota acessível; não há export/uso concreto com este nome.; limite de domínio: acessibilidade/utilitário visual; sem estado de produto.
- **C092 — Announcer** — evidência real: `rg` não encontrou export `Announcer` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: qualquer rota acessível; não há export/uso concreto com este nome.; limite de domínio: acessibilidade/utilitário visual; sem estado de produto.
- **C093 — ScrollArea** — evidência real: `rg` não encontrou export `ScrollArea` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: qualquer rota acessível; não há export/uso concreto com este nome.; limite de domínio: acessibilidade/utilitário visual; sem estado de produto.
- **C094 — Separator** — evidência real: `rg` não encontrou export `Separator` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: qualquer rota acessível; não há export/uso concreto com este nome.; limite de domínio: acessibilidade/utilitário visual; sem estado de produto.
- **C095 — Avatar** — evidência real: `rg` não encontrou export `Avatar` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: identidade/tenant/tema visual por props; sem sessão, tenant real ou registry.
- **C096 — AvatarGroup** — evidência real: `rg` não encontrou export `AvatarGroup` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: identidade/tenant/tema visual por props; sem sessão, tenant real ou registry.
- **C097 — LogoMark** — evidência real: `rg` não encontrou export `LogoMark` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: identidade/tenant/tema visual por props; sem sessão, tenant real ou registry.
- **C098 — AppSwitcher** — evidência real: `rg` não encontrou export `AppSwitcher` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: identidade/tenant/tema visual por props; sem sessão, tenant real ou registry.
- **C099 — TenantSwitcher** — evidência real: `rg` não encontrou export `TenantSwitcher` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: identidade/tenant/tema visual por props; sem sessão, tenant real ou registry.
- **C100 — ThemeSwatches** — evidência real: `rg` não encontrou export `ThemeSwatches` em `packages/design/ui/src` nem componente de mesmo nome nos apps auditados.; estágio: **candidato; não extrair**; status de qualificação: **backlog de validação**; possíveis consumidores: possível: login, shell ou troca de tema; não há export/uso concreto com este nome.; limite de domínio: identidade/tenant/tema visual por props; sem sessão, tenant real ou registry.

## Contagens

| Status | Quantidade |
| --- | ---: |
| Qualificados | 17 |
| Backlog de validação | 83 |
| Total C001–C100 | 100 |
