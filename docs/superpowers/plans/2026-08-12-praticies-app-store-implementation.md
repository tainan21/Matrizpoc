# Praticies App Store — implementation plan

## 1. Shared flow, test-first

- Criar testes falhando para normalização, instalação idempotente, remoção do layout,
  recentes e reordenação.
- Implementar domínio, portas, serviço e adapter de storage em
  `packages/flows/praticies`.
- Documentar responsabilidade, imports aceitos/rejeitados e API pública.

## 2. Hub store

- Adicionar o package ao Hub.
- Criar presenter local e client store controller.
- Implementar `/praticies/apps` com catálogo, busca, filtros, inspector, recentes e
  editor drag-and-drop persistido.
- Conectar `/praticies` à página de instalação sem regressão na geração de Patterns.

## 3. Workbench consumer

- Adicionar o package ao Workbench.
- Criar presenter e launcher local em `/praticies`.
- Registrar rota no shell e no manifest, sem acesso a internals do Hub.

## 4. Registro e documentação

- Atualizar docs do Hub e Workbench, mapa de ownership e decision log.
- Registrar backlog e activity sem alterar score ou concluir roadmap automaticamente.

## 5. Verification

- Rodar testes do package e Workbench.
- Rodar lint, typecheck e build scoped de Hub e Workbench.
- Fazer smoke visual nas duas rotas e validar desktop/mobile.
