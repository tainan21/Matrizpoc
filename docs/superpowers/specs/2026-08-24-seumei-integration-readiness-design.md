# Seumei — Integration Readiness Decision

Data: 2026-08-24  
Estado: decisão de encerramento do ciclo 7

## Objetivo

Encerrar o ciclo de “integrações futuras justificadas” sem criar superfícies vazias, credenciais fictícias ou efeitos externos simulados. O resultado deste ciclo é uma decisão verificável sobre quais integrações têm consumidor real, quem deve possuir seus dados e qual pré-condição autoriza implementação.

## Evidência da referência

- `emails/verification.tsx` e `emails/thanks.tsx` são templates herdados de ChadNext; o segundo declara explicitamente execução mock e nenhum fluxo Seumei envia e-mail.
- `modules/orders/application/order-service.ts` possui uma máquina local de intent/authorize/capture/refund, mas não chama um provedor, não verifica assinatura de webhook e persiste no browser.
- `features/commerce-telemetry/**` calcula analytics a partir de repositories locais; não existe consentimento, retenção ou coletor externo.
- `components/shared/file-uploader.tsx` é apenas UI; não define storage, autorização, antivírus ou ownership.
- Não há adapter real de frete, DNS/domínio, fiscal ou mensagens transacionais.

O conhecimento útil é a separação de lifecycle e os estados de erro. Nenhuma “integração” da referência é interoperabilidade pronta para preservar.

## Decisão

Nenhum novo endpoint, página ou migration de integração será criado nesta assimilação.

1. Convites já têm um route flow real e seguro: Core persiste intenção/token hash e Seumei entrega um link manual. E-mail transacional é o primeiro candidato, mas a outbox pertence à fronteira Core/serviço de mensagens — não ao schema empresarial Seumei. Alterar Core nesta branch conflitaria com o fluxo paralelo e duplicaria ownership.
2. Pagamento permanece `SIMULATED_APPROVED`, rotulado como simulação. Um provedor real exige decisão de negócio, sandbox, segredo, webhook assinado, idempotência, expiração/reserva e política de reembolso.
3. Frete não tem endereço/fulfillment estável suficiente no pedido atual.
4. Domínio customizado depende de ownership DNS, certificado e roteamento do Hub/deploy.
5. Upload de mídia depende de storage, limite, transformação e política de conteúdo.
6. Analytics externo depende de consentimento, retenção e observabilidade tenant-safe.

Criar `/workspace/settings/integrations` agora violaria o requisito de não anunciar capacidade inexistente. O status honesto continua nas superfícies consumidoras: convite informa “Nenhum e-mail foi enviado”; checkout informa compra/pagamento simulados.

## Contrato mínimo para a primeira integração futura

Quando um provedor de e-mail e sandbox forem autorizados, a entrega de convite deve nascer de um contrato público neutro possuído pelo serviço responsável por mensagens/Core:

- comando contém `messageId`, tipo versionado, destinatário normalizado, template e payload mínimo; o bearer token não entra em logs;
- criação do convite e outbox ocorre atomicamente, ou uma reconciliação determinística impede convite sem mensagem desconhecida;
- adapter server-side usa segredo fora do repositório;
- tentativas são append-only, com `PENDING`, `DELIVERED`, `FAILED_RETRYABLE` ou `FAILED_FINAL`;
- idempotência usa `messageId`, e callbacks validam assinatura antes de alterar estado;
- Seumei recebe apenas status público e mantém o link manual como recuperação honesta;
- testes negativos cobrem tenant A/B, token redigido, replay, assinatura inválida e indisponibilidade do provedor.

## Critério para reabrir cada integração

| Integração | Consumidor/flow | Pré-condição indispensável | Prioridade |
| --- | --- | --- | --- |
| E-mail de convite | `/workspace/members` → `/invite/[token]` | owner Core/mensageria, sandbox e sender verificado | P1 |
| Pagamento | `/store/[slug]/checkout` → pedido/financeiro | PSP escolhido, sandbox, webhook e política de estoque/reembolso | P1 após decisão comercial |
| Upload/CDN | `/workspace/store/design` | storage canônico, limites e política de segurança | P2 |
| Frete | checkout → fulfillment | endereço/entrega modelados e transportadora escolhida | P2 |
| Domínio customizado | publicação → DNS/TLS | ownership no Hub/deploy e automação de certificado | P2 |
| Analytics | loja/pedidos → métricas | consentimento, retenção e telemetria tenant-safe | P3 |
| Fiscal | pedido/financeiro → documento | requisito jurídico, provedor e homologação | P3/externo |

## Estado de encerramento

O ciclo 7 está **concluído como gate de integração**: candidatos, ownership, riscos e condições de entrada estão registrados; nenhuma integração foi falsamente declarada operacional. A próxima implementação requer autoridade/credencial externa ou uma decisão de produto que muda materialmente o resultado.
