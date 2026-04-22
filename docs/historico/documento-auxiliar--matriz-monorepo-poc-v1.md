
# Documento Auxiliar — Matriz Monorepo POC V1

## 1. Visão geral

Esta POC não é apenas um app.
Ela é uma **prova estrutural do modelo da Matriz**.

A meta é provar, em uma V1 realista e bem encaixada, que é possível manter múltiplos apps Next.js dentro de um mesmo monorepo, compartilhando base, identidade visual, contratos técnicos e contexto central, sem destruir a autonomia de cada app.

O objetivo não é simular produção perfeita.
O objetivo é validar o esqueleto que sustentará a evolução futura.

---

## 2. O problema que a POC resolve

Hoje existem apps e ideias que precisam coexistir:

* Matriz Hub
* Spot
* Seumei
* Contracts
* WillDash

Todos são multitenant.
Todos podem compartilhar alguns fundamentos.
Todos têm regras próprias.
Todos precisam evoluir.

A POC precisa provar que:

* código compartilhado não destrói autonomia
* visual compartilhado não destrói identidade
* contrato técnico compartilhado não destrói domínio
* comunicação entre apps é possível sem banco único bagunçado
* onboarding pode ser compartilhado sem virar gambiarra
* agentes conseguem trabalhar por fatias com contexto controlado
* a semântica da estrutura ajuda e não atrapalha

---

## 3. Princípios arquiteturais da POC

### 3.1 Monorepo com limites claros

A POC deve existir em um único repositório.
Mas isso não significa mistura.

Cada app deve ter:

* suas telas
* seu domínio
* seus mocks
* sua documentação
* sua configuração
* seu schema Prisma
* sua autonomia visual complementar

### 3.2 Shared não é domínio alheio

Packages compartilhados existem para:

* UI
* sistema visual
* auth base
* types públicos
* onboarding compartilhado
* telemetria base
* eventos
* config
* registry
* contratos públicos
* utilidades estáveis

Não existem para roubar o domínio do app.

### 3.3 Contratos públicos estáveis

Apps não devem depender de estrutura interna alheia.
Devem depender de DTOs, APIs, eventos e adapters.

### 3.4 Separação entre design e regra

O visual precisa ser trocável.
A regra de negócio precisa sobreviver mesmo que o design mude.

### 3.5 Pensado para agentes

Tudo precisa ser legível e previsível.
A POC deve reduzir a necessidade de “varrer o repositório inteiro”.

### 3.6 Nomes devem ensinar responsabilidade

A própria árvore de pastas deve ajudar a explicar o sistema.
A semântica do nome importa.

---

## 4. Escolha estrutural principal

### Escolha adotada

* um monorepo
* múltiplos apps Next.js
* múltiplos packages com categorias semânticas
* schemas Prisma separados por app
* sem banco real nesta V1
* mocks estruturados compatíveis com futura persistência
* manifest e registry funcionais
* event bus simples
* external links reais em conceito
* onboarding compartilhado como prova central

### O que isso prova

* ownership por app
* reutilização de base
* integração sem colapso estrutural
* caminho claro para próxima fase
* separação forte entre design, base, integração e domínio

---

## 5. Categorias de packages e por que elas existem

### design

Tudo que é visual compartilhado.

### platform

Tudo que é serviço técnico compartilhável.

### access

Tudo que é contexto de acesso e escopo de uso.

### integration

Tudo que conecta apps e define contratos públicos.

### flows

Tudo que representa fluxos compartilháveis completos.

### foundation

Tudo que é base neutra e estável.

Essa divisão existe para evitar o clássico package gigante amorfo.

---

## 6. Apps e escopo mínimo

### 6.1 Matriz Hub

Deve provar:

* shell do ecossistema
* catálogo de apps
* leitura de registry
* leitura de manifest
* navegação unificada
* status de onboarding
* leitura simples de eventos e external links

### 6.2 Spot

Deve provar:

* app autônomo dentro do ecossistema
* domínio mínimo de bandas e gigs
* integração com onboarding compartilhado
* integração com contracts
* identidade visual própria sobre base comum

### 6.3 Seumei

Deve provar:

* app autônomo dentro do ecossistema
* domínio mínimo de establishments/operação
* integração com onboarding compartilhado
* integração com contracts
* identidade visual própria sobre base comum

### 6.4 Contracts

Deve provar:

* domínio compartilhável entre apps
* contrato criado via diferentes contextos
* DTOs públicos claros
* adapters e mappers
* external links
* listagem e detalhe de contratos

### 6.5 WillDash

Deve provar:

* presença de novo app sem quebrar o ecossistema
* onboarding compartilhado
* telemetria base compartilhada
* integração leve com o hub

---

## 7. Narrativa funcional da POC

A POC deve permitir o seguinte filme:

1. o usuário entra no Matriz Hub
2. vê os apps cadastrados
3. escolhe um app
4. é direcionado para onboarding compartilhado se necessário
5. conclui o onboarding base + etapa específica do app
6. entra no app selecionado
7. cria ou seleciona uma entidade mock
8. aciona Contracts
9. o contrato é criado com referências externas
10. o Hub consegue mostrar o reflexo dessa ação
11. um evento interno fica visível
12. o sistema continua compreensível mesmo com múltiplos apps

Essa narrativa precisa parecer verdadeira, mesmo sem backend real.

---

## 8. Onboarding compartilhado aprofundado

O onboarding é a melhor feature para provar compartilhamento com autonomia.

### 8.1 O que ele deve provar

* coleta de dados comuns uma vez
* customização por app
* reuso visual
* reuso de fluxo
* reuso de tipos
* compatibilidade com futuro Prisma
* possibilidade de expandir para apps reais depois

### 8.2 Dados compartilhados do onboarding

* tenantName
* tenantSlug
* brandName
* primaryColor
* locale
* enabledApps
* ownerName
* ownerEmail

### 8.3 Dados específicos por app

#### Spot

* artistModeEnabled
* preferredGenres
* bookingModel

#### Seumei

* establishmentType
* serviceMode
* menuModel

#### Contracts

* defaultTemplateCode
* defaultPartyRoleLabels

#### WillDash

* goalTrackingMode
* rewardPreference

### 8.4 Estrutura técnica sugerida

* package compartilhado `packages/flows/onboarding`
* step definitions compartilhadas
* renderers visuais vindos de `packages/design/ui`
* tokens e temas vindos de `packages/design/system`
* registries por app para etapas específicas
* DTO compartilhado de saída
* adapters locais por app

### 8.5 Persistência da POC

Sem banco real.
Usar mock store central com shape de futuro Prisma.

---

## 9. Schemas Prisma sugeridos

### 9.1 core.prisma

Modelos sugeridos:

* Tenant
* User
* Membership
* AppRegistration
* ExternalLink
* OnboardingProgress
* SharedSession
* TelemetryRecord

### 9.2 spot.prisma

Modelos sugeridos:

* Band
* ArtistProfile
* Gig
* GigBooking
* SpotSettings

### 9.3 seumei.prisma

Modelos sugeridos:

* Establishment
* EstablishmentProfile
* ServiceArea
* SeumeiSettings

### 9.4 contracts.prisma

Modelos sugeridos:

* Contract
* ContractParty
* ContractVersion
* ContractEvent
* ContractTemplate

### 9.5 willdash.prisma

Modelos sugeridos:

* Goal
* RewardRule
* ActivityRecord
* WilldashSettings

### Observação

Mesmo sem banco real, os nomes, campos e relações precisam ser coerentes o suficiente para uma futura persistência real.

---

## 10. Mocks estruturados

A POC deve ter mocks separados por app, mas com tipos públicos compartilhados quando necessário.

### Exemplo de mocks globais

* mockTenants
* mockUsers
* mockMemberships
* mockExternalLinks
* mockRegistryEntries
* mockTelemetryEvents
* mockOnboardingProgress

### Exemplo de mocks do Spot

* mockBands
* mockArtistProfiles
* mockGigs

### Exemplo de mocks da Seumei

* mockEstablishments
* mockServiceProfiles

### Exemplo de mocks de Contracts

* mockContracts
* mockContractTemplates
* mockContractEvents

### Exemplo de mocks do WillDash

* mockGoals
* mockRewardRules
* mockActivities

---

## 11. External links aprofundado

External links são o elo entre apps sem depender de leitura direta de tabelas alheias.

### O que precisam provar

* Contracts consegue referenciar origem no Spot
* Contracts consegue referenciar entidade da Seumei
* Hub consegue exibir relacionamento cruzado
* evolução futura continua possível

### Formato conceitual

* local app e entidade
* external app e entidade
* relation type
* snapshot da origem

### Exemplos de relation type

* originated_from
* linked_to
* created_for
* references

---

## 12. Manifest aprofundado

Cada app deve ter um manifest funcional.

### Campos mínimos

* appId
* displayName
* shortDescription
* version
* category
* routes
* capabilities
* eventsProduced
* eventsConsumed
* onboardingRequired
* integrationsAvailable
* widgetsExposed
* navigationEntry
* ownershipSummary

### Exemplo de capability

* `spot.gig.create`
* `contracts.contract.create`
* `seumei.establishment.read`

### Função prática do manifest

* alimentar Hub
* alimentar Registry
* servir de catálogo técnico
* orientar integração entre apps

---

## 13. Registry aprofundado

O registry é a lista ativa de apps e capacidades.

### Deve permitir

* listar apps ativos
* buscar por capability
* buscar apps que consomem certos eventos
* resolver navegação
* montar catálogo para Hub
* informar suporte de onboarding
* informar integrações disponíveis

### Provas mínimas

* Hub usa registry
* Spot encontra Contracts
* Seumei encontra Contracts
* onboarding consegue saber apps habilitados

---

## 14. DTOs, adapters e mappers aprofundados

A POC deve tratar isso como obrigatório, não decorativo.

### DTOs

Contratos públicos entre apps.

### Adapters

Transformam dados de um contexto em outro.

### Mappers

Transformam DTO em modelo interno, modelo interno em view model, e assim por diante.

### Provas mínimas

* dado vindo do Spot não entra cru em Contracts
* dado vindo da Seumei não entra cru em Contracts
* onboarding compartilhado não vaza modelo interno do app
* summaries públicos são independentes da estrutura interna do app

---

## 15. Event bus da POC

Não precisa ser complexo.
Precisa ser explícito.

### Objetivo

Provar comunicação reativa entre apps.

### Exemplo de pipeline

* Spot emite `spot.gig.created`
* Contracts pode oferecer ação de criação de contrato
* Contracts emite `contracts.contract.created`
* Hub reflete novo contrato

### Requisitos técnicos

* bus simples
* handler registrável
* histórico de eventos mock
* possibilidade de inspecionar visualmente

---

## 16. Telemetria compartilhada com especialização por app

### Compartilhado

* shape base
* helper de envio
* armazenamento mock
* render básico

### Específico

* Spot: bandas visualizadas, gigs criadas
* Seumei: establishments vistos, ações de operação
* Contracts: contratos criados, templates usados
* Hub: apps acessados
* WillDash: metas abertas e interações mock

### Prova mínima

* eventos aparecem no Hub
* app de origem aparece corretamente
* propriedades específicas por app são mantidas

---

## 17. APIs internas/mocks sugeridas

### Spot

* listGigs
* createGig
* requestContractFromGig
* listBands

### Seumei

* listEstablishments
* selectEstablishment
* requestContractForEstablishment
* listProfiles

### Contracts

* listContracts
* createContract
* createContractFromGig
* createContractFromEstablishment
* getContractDetails

### Hub

* listRegisteredApps
* listRecentEvents
* listExternalLinks
* getOnboardingStatus

### WillDash

* listGoals
* listActivities
* emitTelemetryDemo

---

## 18. Estrutura de packages sugerida

### packages/design/ui

botões, cards, tabelas, shell components, badges, forms, nav

### packages/design/system

cores, tokens, spacing, typography, semantic roles, theme helpers

### packages/platform/auth

session mock, otp mock, magic link mock, shared types, guards

### packages/platform/storage

in-memory store, local persistence helpers, mock repository helpers

### packages/platform/notifications

toast model, feed model, notification helpers

### packages/platform/telemetry

event client, event types, history reader

### packages/platform/pdf

contract print model, render helpers mock, export mock

### packages/platform/config

app config, shared constants, runtime config helpers

### packages/platform/i18n

messages shared, locale helpers, dictionaries base

### packages/platform/env

env contracts, env readers, environment typing

### packages/access/tenants

tenant context, selectors, hooks, dto base

### packages/access/permissions

roles mock, access helpers, permission maps

### packages/integration/events

event bus, event types, subscribers

### packages/integration/registry-core

manifest parser, registry builder, app discovery helpers

### packages/integration/manifests

types and helpers for manifest shape

### packages/integration/external-links

types and helpers for link records

### packages/integration/api-contracts

public DTOs, request/response contracts, integration inputs

### packages/flows/onboarding

shared steps, step renderer base, shared forms, output dto

### packages/foundation/types

shared primitives and public types

### packages/foundation/utils

helpers utilitários estáveis

### packages/foundation/constants

constantes e enums base

### packages/foundation/schemas

schemas base de validação e contratos técnicos

---

## 19. Estrutura detalhada por app

### apps/matriz-hub

* landing
* app catalog
* registry explorer
* event explorer
* external link explorer
* onboarding state summary

### apps/spot

* overview
* gigs list
* gig detail
* request contract action
* app-specific onboarding step

### apps/seumei

* overview
* establishments list
* establishment detail
* request contract action
* app-specific onboarding step

### apps/contracts

* contracts list
* contract detail
* contract timeline
* linked entities panel
* source context panel
* template panel

### apps/willdash

* overview
* goals summary
* onboarding proof
* telemetry proof

---

## 20. Documentação global obrigatória

Criar documentos como:

* `docs/architecture-overview.md`
* `docs/monorepo-structure.md`
* `docs/shared-contracts.md`
* `docs/events-conventions.md`
* `docs/external-links.md`
* `docs/agent-navigation-guide.md`
* `docs/onboarding-shared-flow.md`
* `docs/package-categories.md`
* `docs/app-ownership-map.md`

---

## 21. Documentação local por app obrigatória

Em cada app:

* `docs/README.md`
* `docs/DOMAIN.md`
* `docs/API.md`
* `docs/MANIFEST.md`
* `docs/AGENT-START-HERE.md`
* `docs/INTEGRATIONS.md`

---

## 22. Guia para agentes

A POC deve facilitar agentes assim:

### Regras

* cada app tem uma doc “comece aqui”
* cada package tem uma doc curta de responsabilidade
* dependências devem ser óbvias
* contratos públicos devem estar centralizados
* onboarding compartilhado deve ser claramente localizado
* evitar misturar domínios no mesmo arquivo
* isolar por fatia semântica

### Objetivo

Permitir prompts que foquem apenas em:

* um app
* um package
* uma integração
* um fluxo
* um tipo de contrato

---

## 23. Nomeação e convenções

### Sugestões

* DTOs em `contracts/dtos` ou package público dedicado
* Mappers em `integration/mappers`
* Adapters em `integration/adapters`
* Use cases em `application/use-cases`
* Modelos de domínio em `domain/models`
* Regras em `domain/rules`
* Gateways em `integration/gateways`

### Eventos

Usar naming consistente. Exemplo:

* `spot.gig.created`
* `seumei.establishment.selected`
* `contracts.contract.created`
* `core.onboarding.completed`

---

## 24. Fluxos de prova obrigatórios

### Fluxo A

Hub → Spot → Onboarding compartilhado → criação de gig → contrato → Hub atualizado

### Fluxo B

Hub → Seumei → Onboarding compartilhado → seleção de establishment → contrato → Hub atualizado

### Fluxo C

Hub → Contracts → leitura de external links → origem exibida corretamente

### Fluxo D

Hub → WillDash → onboarding compartilhado → emissão de telemetria → Hub atualizado

---

## 25. O que faltava e foi complementado aqui

Esta POC também deve contemplar:

* shell de navegação do ecossistema
* separação explícita entre infraestrutura compartilhada e domínio específico
* contrato público em package dedicado
* onboarding compartilhado como prova central
* docs para humano e agente
* telemetria base compartilhada
* naming conventions fortes
* base clara para trazer apps reais depois
* semântica forte de pastas
* separação mais rígida entre visual e funcional

---

## 26. O que valida o sucesso da POC

A POC será considerada bem-sucedida se:

* a estrutura estiver clara
* os apps coexistirem sem parecer bagunça
* o onboarding compartilhado provar reuso com autonomia
* Contracts funcionar como app compartilhável
* manifests e registry funcionarem de verdade
* external links estiverem visíveis e coerentes
* eventos estiverem claros
* packages compartilhados fizerem sentido
* docs internas orientarem bem humanos e agentes
* a base parecer pronta para receber apps reais futuramente
* a semântica das pastas reduzir ambiguidade

---

## 27. Direção estratégica após a V1

Se essa POC ficar redonda, o próximo passo natural é:

* trazer apps reais para dentro do monorepo
* conectar o Prisma a banco real
* substituir mocks por repositórios reais
* manter DTOs, mappers, adapters e contracts públicos
* aprofundar workflows e integrações
* só então discutir infra pesada com mais seriedade

A V1 precisa ser forte o suficiente para evoluir.
Não precisa ser bonita.
Precisa ser correta, coerente e funcional.

---

## 28. Observação final

A POC não deve ser tratada como um brinquedo visual.
Ela deve ser tratada como um **ensaio estrutural definitivo** do ecossistema Matriz.

Mesmo com mocks, tudo precisa nascer com lógica, nomeação, separação e responsabilidade fortes o bastante para não exigir recomeço quando os apps reais forem trazidos para dentro do repositório.
