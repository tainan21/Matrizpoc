# Product baseline — 0.1.0

## Objetivo

Oferecer uma visão administrativa pequena, clara e confiável sobre sistemas, site, analytics, pagamentos e integrações de um cliente. Laudate é o primeiro tenant; o produto não contém regras Laudate-specific.

## Experiência aprovada

Layout operacional responsivo, sidebar orientada por ícones, superfícies neutras quentes e dourado como único acento. Textos existem para explicar estados e decisões, não para preencher a interface. Dashboard e métricas aparecem apenas quando sustentados por dados reais.

## Decisões

- Web na Vercel é a experiência principal.
- Tauri Windows valida a experiência real de produção e depois fica congelado.
- Hub é owner das projeções; este app não possui banco.
- Tenant vem da sessão OIDC, jamais de input autoritativo do browser.
- Seções falham isoladamente e preservam a última leitura válida.
- Ausência de banco, credenciais ou registros é um estado previsto.

## Não objetivos da V1

Configuração pela UI, edição financeira, ledger, analytics próprio, rota dedicada de acessos, multi-tenancy complexo e extração antecipada de packages compartilhados.

## Evolução

Os cinco sistemas Laudate entrarão no catálogo e publicarão snapshots pelos contratos do Hub quando seus códigos e necessidades reais forem conhecidos. Vercel, GA4 e HTTP são ports substituíveis.

## Congelamento

Após a publicação `0.1.0`, aceitar somente correções críticas, de segurança ou publicação até existirem dados reais e os cinco sistemas Laudate.
