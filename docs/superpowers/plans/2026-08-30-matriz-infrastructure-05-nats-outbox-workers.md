# Plano 5 — NATS, outbox e workers

## Entregas

- NATS JetStream loopback, contas/ACLs por subjects do manifest.
- Baseline outbox/inbox no schema de cada participante; publisher e consumer
  idempotentes, ACK ordering, retries e dead-letter stream.
- Subjects `matriz.v1.<domain>.<event>`, `Nats-Msg-Id = outbox.id`.
- Retenção: publicados/processados 7 dias; DLQ 30 dias; pendentes nunca podados.
- Adoção: Pay, Seumei, Hub, Identity; depois Spot, Contracts, WillDash; Ops
  consome projeções. EventBus process-local fica somente em testes até remoção.

## Testes e gate

Queda antes/depois de ACK, NATS indisponível, replay, duplicata, poison message,
DLQ e pruning. Saída: evento commitado sobrevive a restart e duplicata não
repete efeito.

## Status em 2026-08-30

- Pay, Seumei e Hub: publisher durável, retry/DLQ, credencial NATS por domínio e
  worker database role restrita implementados.
- Seumei: seleção e outbox confirmam ou revertem juntas; EventBus em memória não
  participa mais do fluxo autoritativo.
- Hub/MatrizDocs: comandos produtores usam o mesmo cliente transacional;
  timeline e outbox são gravadas juntas.
- Inbox e projeções consumidoras continuam pendentes; `events.inbox` declarado
  não representa conclusão operacional.
- Identity/Core, Spot, Contracts, WillDash e Ops ainda aguardam adoção.
