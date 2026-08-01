import type { Metadata } from "next"
import Image from "next/image"
import type { CSSProperties } from "react"
import styles from "./audit.module.css"

export const metadata: Metadata = {
  title: "Auditoria de Arquitetura | Matriz",
  description:
    "Diagnóstico técnico, evidências do produto e os próximos 30 passos do Matriz Infra Hub.",
}

type Priority = "Crítica" | "Alta" | "Média"

interface RoadmapStep {
  readonly number: number
  readonly title: string
  readonly reason: string
  readonly output: string
  readonly effort: string
  readonly priority: Priority
  readonly dependency: string
}

interface RoadmapPhase {
  readonly id: string
  readonly label: string
  readonly window: string
  readonly objective: string
  readonly color: string
  readonly steps: readonly RoadmapStep[]
}

const phases: readonly RoadmapPhase[] = [
  {
    id: "containment",
    label: "01 · Contenção",
    window: "Dias 1–10",
    objective: "Fechar caminhos de exploração antes de expandir o produto.",
    color: "#ff6b5f",
    steps: [
      {
        number: 1,
        title: "Aplicar o patch de segurança do Next.js",
        reason:
          "A versão 16.2.4 possui advisories conhecidos e concentra as 26 vulnerabilidades encontradas no audit.",
        output: "Next.js 16.2.12 validado nos cinco apps e audit de produção verde.",
        effort: "1–2 dias",
        priority: "Crítica",
        dependency: "Nenhuma",
      },
      {
        number: 2,
        title: "Conter as ferramentas mutantes do MCP",
        reason:
          "O endpoint público aceita operações de escrita sem autenticação, rate limit ou aprovação humana.",
        output:
          "MCP inicialmente read-only, com limite de body/batch e tools mutantes desabilitadas.",
        effort: "1–2 dias",
        priority: "Crítica",
        dependency: "Passo 1",
      },
      {
        number: 3,
        title: "Remover identidade e tenant de headers públicos",
        reason:
          "Hoje o cliente pode declarar `x-actor` e `x-tenant`, tornando a autorização falsificável.",
        output:
          "Authorization context derivado de sessão; headers externos ignorados ou rejeitados.",
        effort: "2–3 dias",
        priority: "Crítica",
        dependency: "Inventário das rotas protegidas",
      },
      {
        number: 4,
        title: "Corrigir as mutações cross-tenant de MatrizDocs",
        reason:
          "A revisão de sugestão altera o registro antes de confirmar o tenant, e documentos misturam blocos de versões.",
        output: "Validação anterior à escrita, filtro por versão e falha atômica em mismatch.",
        effort: "2 dias",
        priority: "Crítica",
        dependency: "Passo 3",
      },
      {
        number: 5,
        title: "Criar a suíte mínima de isolamento A/B",
        reason:
          "Sem testes de dois tenants, regressões de leitura e escrita cruzadas continuarão invisíveis.",
        output: "Matriz de autorização e testes negativos para API, repository e MCP.",
        effort: "3–4 dias",
        priority: "Crítica",
        dependency: "Passos 3–4",
      },
    ],
  },
  {
    id: "foundation",
    label: "02 · Fundação",
    window: "Semanas 2–4",
    objective: "Tornar autenticação e dados reproduzíveis, verificáveis e tenant-safe.",
    color: "#e8b34b",
    steps: [
      {
        number: 6,
        title: "Escolher e adotar a autenticação server-side canônica",
        reason:
          "A biblioteca de auth existente não protege o servidor; a sessão efetiva vive em localStorage.",
        output: "ADR de auth, cookie seguro, expiração, revogação e fluxo local documentado.",
        effort: "4–6 dias",
        priority: "Crítica",
        dependency: "Passo 3",
      },
      {
        number: 7,
        title: "Centralizar o AuthorizationContext",
        reason:
          "Cada rota não deve reconstruir regras de identidade, tenant, roles e capabilities.",
        output: "Uma fronteira server-only testável usada por route handlers, use cases e MCP.",
        effort: "3–4 dias",
        priority: "Crítica",
        dependency: "Passo 6",
      },
      {
        number: 8,
        title: "Garantir tenant nas relações do banco",
        reason:
          "Foreign keys apenas por `id` permitem relacionamentos inconsistentes entre tenants.",
        output:
          "Chaves compostas `[tenantId, id]`, índices correspondentes e plano de RLS defensivo.",
        effort: "4–6 dias",
        priority: "Crítica",
        dependency: "Modelo de tenant aprovado",
      },
      {
        number: 9,
        title: "Criar a migration baseline dos seis schemas",
        reason:
          "Sem histórico versionado não existe evolução auditável nem deploy reproduzível do Postgres.",
        output:
          "Baseline, convenção de migrations, migrate deploy e rollback operacional documentado.",
        effort: "3–5 dias",
        priority: "Crítica",
        dependency: "Passo 8",
      },
      {
        number: 10,
        title: "Corrigir a geração dos seis Prisma Clients",
        reason:
          "O script raiz omite Spot e WillDash e há imports acoplados a internals de `node_modules`.",
        output: "Outputs explícitos, geração completa e clone limpo passando typecheck e smoke.",
        effort: "2–3 dias",
        priority: "Alta",
        dependency: "Passo 9",
      },
    ],
  },
  {
    id: "vertical",
    label: "03 · Fluxo real",
    window: "Semanas 4–6",
    objective: "Provar uma integração vertical completa antes de multiplicar abstrações.",
    color: "#65d7a7",
    steps: [
      {
        number: 11,
        title: "Implementar o endpoint real de criação em Contracts",
        reason: "Os gateways de Spot e Seumei chamam rotas que não existem no app produtor.",
        output:
          "Route handler validado por DTO, autorizado por capability e coberto por contract test.",
        effort: "3–4 dias",
        priority: "Crítica",
        dependency: "Passos 6–10",
      },
      {
        number: 12,
        title: "Conectar Spot → Contracts por HTTP tipado",
        reason:
          "O fallback atual fabrica um contrato local sem persistência e confirma uma operação que não ocorreu.",
        output:
          "Gateway HTTP real com timeout, erro explícito, correlation ID e sem falso sucesso.",
        effort: "3–4 dias",
        priority: "Crítica",
        dependency: "Passo 11",
      },
      {
        number: 13,
        title: "Adicionar idempotência e transação ao fluxo",
        reason:
          "Retries podem duplicar contratos, links e eventos; agregados são gravados em várias operações.",
        output: "Idempotency key, constraint única e transação cobrindo contrato e vínculo.",
        effort: "3 dias",
        priority: "Alta",
        dependency: "Passo 12",
      },
      {
        number: 14,
        title: "Persistir ExternalLink e eventos via outbox",
        reason: "Os singletons em memória não atravessam processos, regiões ou reinícios.",
        output: "Outbox transacional, worker simples e entrega observável com retry.",
        effort: "5–7 dias",
        priority: "Alta",
        dependency: "Passo 13",
      },
      {
        number: 15,
        title: "Criar E2E cross-app de processos reais",
        reason:
          "A suíte atual instancia produtor e consumidor no mesmo processo e não prova o protocolo.",
        output: "Spot e Contracts separados, Postgres real e asserção de persistência + evento.",
        effort: "3–5 dias",
        priority: "Alta",
        dependency: "Passos 11–14",
      },
    ],
  },
  {
    id: "quality",
    label: "04 · Qualidade",
    window: "Semanas 6–8",
    objective: "Transformar checks locais em garantia de release e operação.",
    color: "#63b3ff",
    steps: [
      {
        number: 16,
        title: "Endurecer o pipeline de CI",
        reason:
          "A CI não gera Prisma Clients, não executa os cinco builds e não bloqueia advisories.",
        output: "Install → generate → validate → lint → typecheck → test → build → audit.",
        effort: "2–3 dias",
        priority: "Alta",
        dependency: "Passo 10",
      },
      {
        number: 17,
        title: "Entregar Postgres local reproduzível",
        reason:
          "O onboarding depende hoje de infraestrutura não documentada e banco pré-existente.",
        output: "Compose local, healthcheck, migrate, seed mínimo e comando de reset seguro.",
        effort: "2–3 dias",
        priority: "Alta",
        dependency: "Passo 9",
      },
      {
        number: 18,
        title: "Implantar observabilidade fora do processo",
        reason:
          "Telemetria em memória desaparece no restart e não correlaciona requisições distribuídas.",
        output: "Logs estruturados, traces, métricas, request ID e tenant ID sem PII.",
        effort: "4–6 dias",
        priority: "Alta",
        dependency: "Fluxo real do passo 15",
      },
      {
        number: 19,
        title: "Padronizar erros seguros e estados do App Router",
        reason:
          "Erros internos vazam detalhes e não existem `loading`, `error` ou `not-found` dedicados.",
        output: "Error envelope, redaction, boundaries por rota e UX de recuperação.",
        effort: "3–4 dias",
        priority: "Alta",
        dependency: "AuthorizationContext",
      },
      {
        number: 20,
        title: "Definir orçamento de consultas e cache",
        reason:
          "MatrizDocs usa N+1 de escrita, leituras amplas e `force-dynamic` sem política explícita.",
        output: "Paginação, índices, batch writes, query budget e matriz de cache/revalidação.",
        effort: "4–6 dias",
        priority: "Alta",
        dependency: "Observabilidade de banco",
      },
    ],
  },
  {
    id: "experience",
    label: "05 · Experiência",
    window: "Semanas 8–10",
    objective: "Dar ao ecossistema uma interface consistente, responsiva e acessível.",
    color: "#c8a5ff",
    steps: [
      {
        number: 21,
        title: "Reconstruir o shell responsivo do Hub",
        reason: "A sidebar fixa de 240 px comprime o conteúdo em viewport mobile.",
        output: "Navegação desktop sticky, drawer mobile, foco gerenciado e conteúdo sem overflow.",
        effort: "3–4 dias",
        priority: "Alta",
        dependency: "Nenhuma",
      },
      {
        number: 22,
        title: "Criar o sistema canônico de estados de tela",
        reason:
          "Loading, vazio, erro, indisponível e sucesso variam por app ou simplesmente não existem.",
        output: "Primitives + padrões documentados para skeleton, empty state, retry e feedback.",
        effort: "4–5 dias",
        priority: "Alta",
        dependency: "Passo 19",
      },
      {
        number: 23,
        title: "Unificar tokens e primitives do design system",
        reason:
          "CSS vars, app themes, estilos inline e o utility shim formam múltiplas fontes de verdade.",
        output: "Escalas canônicas, variantes semânticas e remoção incremental do drift.",
        effort: "5–8 dias",
        priority: "Média",
        dependency: "Inventário visual",
      },
      {
        number: 24,
        title: "Estabelecer baseline de acessibilidade",
        reason: "Forms, navegação e estados ativos possuem lacunas sem cobertura automatizada.",
        output: "Labels, landmarks, skip links, keyboard, contraste, axe e Lighthouse no gate.",
        effort: "4–6 dias",
        priority: "Alta",
        dependency: "Passos 21–23",
      },
    ],
  },
  {
    id: "governance",
    label: "06 · Governança",
    window: "Semanas 10–12",
    objective: "Reduzir entropia organizacional antes de adicionar dezenas de módulos.",
    color: "#7dd3fc",
    steps: [
      {
        number: 25,
        title: "Devolver domínio forte aos apps",
        reason:
          "`platform-db` carrega repositories de Contracts, Seumei e Hub, contrariando a lei L12.",
        output:
          "Repositories app-local; package compartilhado limitado a client, transaction e infra neutra.",
        effort: "5–8 dias",
        priority: "Alta",
        dependency: "Migrations estáveis",
      },
      {
        number: 26,
        title: "Dividir o repository monolítico de MatrizDocs",
        reason:
          "Mais de 1.200 linhas concentram documentos, versões, grafo, sugestões, exports e timeline.",
        output: "Repositories por agregado e use cases transacionais com superfícies menores.",
        effort: "6–10 dias",
        priority: "Alta",
        dependency: "Passos 8–10",
      },
      {
        number: 27,
        title: "Completar o sistema de governança do monorepo",
        reason:
          "Quatro AGENTS de app estão vazios; package AGENTS, decision log e change safety não existem.",
        output:
          "Ownership verificável, ADR/decision log, package rules e readiness baseado em risco.",
        effort: "3–5 dias",
        priority: "Média",
        dependency: "Ownership técnico definido",
      },
    ],
  },
  {
    id: "intelligence",
    label: "07 · IA & escala",
    window: "Semanas 12–16",
    objective: "Habilitar agentes e crescimento somente sobre uma fundação governada.",
    color: "#64efb4",
    steps: [
      {
        number: 28,
        title: "Reabrir MCP com scopes e aprovação",
        reason:
          "Agentes precisam de descoberta útil, mas mutations exigem governança, auditoria e replay seguro.",
        output: "MCP autenticado, tools por capability, approval flow, audit trail e idempotência.",
        effort: "6–8 dias",
        priority: "Alta",
        dependency: "Passos 6–7, 18–19",
      },
      {
        number: 29,
        title: "Construir retrieval com proveniência e avaliação",
        reason:
          "As flags atuais não implementam chunking, embeddings, redaction nem medição de qualidade.",
        output:
          "Corpus versionado, chunks citáveis, política de dados, eval dataset e vector search.",
        effort: "8–12 dias",
        priority: "Média",
        dependency: "MatrizDocs estável + passo 28",
      },
      {
        number: 30,
        title: "Provar o modelo SaaS em um tenant piloto",
        reason:
          "Feature flags, white-label, i18n e capacidade precisam ser validados juntos em operação real.",
        output:
          "Lifecycle de tenant, flags persistentes, tema, locale, quotas, SLO e teste de carga.",
        effort: "10–15 dias",
        priority: "Alta",
        dependency: "Passos 1–29",
      },
    ],
  },
]

const evidence = [
  {
    src: "/audit/02-hub-home-desktop.png",
    app: "Matriz Hub",
    title: "Catálogo central",
    note: "O Hub registra os cinco apps, mas a navegação lateral ainda é fixa e não responde bem ao mobile.",
  },
  {
    src: "/audit/05-spot-gigs-desktop.png",
    app: "Spot",
    title: "Gestão de gigs",
    note: "Estado vazio coerente, porém sem ação primária para cadastrar a primeira gig.",
  },
  {
    src: "/audit/06-seumei-establishments-desktop.png",
    app: "Seumei",
    title: "Estabelecimentos",
    note: "Identidade própria clara; a experiência ainda depende de mocks e dados locais.",
  },
  {
    src: "/audit/07-contracts-list-desktop.png",
    app: "Contracts",
    title: "Contratos do tenant",
    note: "O produto apresenta dados convincentes, mas o fluxo cross-app não persiste de ponta a ponta.",
  },
  {
    src: "/audit/08-willdash-goals-desktop.png",
    app: "WillDash",
    title: "Metas e progresso",
    note: "A quinta aplicação prova extensibilidade visual, ainda com tenant e seeds de demonstração.",
  },
  {
    src: "/audit/04-hub-docs-desktop.png",
    app: "MatrizDocs",
    title: "Degradação sem banco",
    note: "A página não quebra completamente, mas expõe detalhes internos do erro de infraestrutura.",
  },
] as const

const scores = [
  ["Arquitetura", "5,5"],
  ["Segurança", "2,0"],
  ["Multi-tenant", "2,0"],
  ["DX", "4,5"],
  ["UX", "4,0"],
  ["IA / MCP", "3,8"],
] as const

export default function ArchitectureAuditPage() {
  return (
    <div className={styles.audit}>
      <a className={styles.skipLink} href="#content">
        Ir para o conteúdo
      </a>

      <header className={styles.hero}>
        <nav className={styles.heroNav} aria-label="Navegação da auditoria">
          <a className={styles.wordmark} href="#top" aria-label="Matriz, início da auditoria">
            <span aria-hidden="true">M/</span>
            <span>Matriz</span>
          </a>
          <div className={styles.heroLinks}>
            <a href="#architecture">Arquitetura</a>
            <a href="#evidence">Evidências</a>
            <a href="#roadmap">30 passos</a>
          </div>
          <span className={styles.reportDate}>27 JUL 2026</span>
        </nav>

        <div className={styles.heroBody} id="top">
          <p className={styles.eyebrow}>Principal architecture review · Snapshot local</p>
          <h1>
            Uma base promissora.
            <span>Ainda não uma plataforma.</span>
          </h1>
          <p className={styles.heroSummary}>
            O desenho modular está no caminho certo. Segurança, isolamento de tenant, persistência e
            integração real precisam alcançar as leis que o repositório já declara.
          </p>
        </div>

        <div className={styles.heroMetrics} aria-label="Resumo quantitativo">
          <div>
            <strong>4,2</strong>
            <span>nota atual / 10</span>
          </div>
          <div>
            <strong>05</strong>
            <span>apps executados</span>
          </div>
          <div>
            <strong>118</strong>
            <span>smokes após generate</span>
          </div>
          <div>
            <strong>30</strong>
            <span>próximos passos</span>
          </div>
        </div>

        <div className={styles.heroRule} aria-hidden="true">
          <span />
        </div>
      </header>

      <main id="content">
        <section className={styles.verdict} aria-labelledby="verdict-title">
          <div className={styles.sectionIndex}>00</div>
          <div className={styles.verdictLead}>
            <p className={styles.kicker}>Decisão recomendada</p>
            <h2 id="verdict-title">Estabilizar. Não reescrever.</h2>
          </div>
          <div className={styles.verdictCopy}>
            <p>
              A arquitetura conceitual — apps com ownership, contratos públicos e shared packages
              neutros — deve ser preservada. O próximo ciclo precisa fechar um fluxo vertical real
              antes de criar novas abstrações.
            </p>
            <p>
              A meta dos 30 passos não é “modernizar tudo”. É transformar intenção em garantia
              operacional, com checkpoints que possam interromper o avanço quando uma fundação ainda
              não estiver comprovada.
            </p>
          </div>
        </section>

        <section className={styles.scoreStrip} aria-label="Notas selecionadas">
          {scores.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <section
          className={styles.architecture}
          id="architecture"
          aria-labelledby="architecture-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>01 · Arquitetura</p>
              <h2 id="architecture-title">Da memória local à confiança distribuída.</h2>
            </div>
            <p>
              O alvo não é microserviço por padrão. É um modular monolith bem delimitado, usando
              protocolos reais apenas nas fronteiras entre deployments.
            </p>
          </div>

          <div className={styles.architectureCanvas}>
            <article className={styles.architectureState}>
              <header>
                <span>AS-IS</span>
                <strong>Runtime de demonstração</strong>
              </header>
              <div className={styles.architectureFlow}>
                <div className={styles.node} data-tone="danger">
                  <small>IDENTIDADE</small>
                  <strong>localStorage + headers</strong>
                  <span>cliente declara ator e tenant</span>
                </div>
                <span className={styles.flowArrow} aria-hidden="true">
                  ↓
                </span>
                <div className={styles.appRail} aria-label="Aplicações atuais">
                  <span>Hub</span>
                  <span>Spot</span>
                  <span>Seumei</span>
                  <span>Contracts</span>
                  <span>WillDash</span>
                </div>
                <span className={styles.flowArrow} aria-hidden="true">
                  ↓
                </span>
                <div className={styles.node} data-tone="warning">
                  <small>INTEGRAÇÃO</small>
                  <strong>Singletons + rotas ausentes</strong>
                  <span>sucesso local não comprova persistência</span>
                </div>
                <span className={styles.flowArrow} aria-hidden="true">
                  ↓
                </span>
                <div className={styles.node} data-tone="danger">
                  <small>DADOS</small>
                  <strong>6 schemas sem migrations</strong>
                  <span>foreign keys não protegem o tenant</span>
                </div>
              </div>
            </article>

            <div className={styles.architecturePivot} aria-hidden="true">
              <span>30</span>
              <small>passos</small>
            </div>

            <article className={styles.architectureState} data-target="true">
              <header>
                <span>TO-BE</span>
                <strong>Fundação de produto</strong>
              </header>
              <div className={styles.architectureFlow}>
                <div className={styles.node} data-tone="success">
                  <small>IDENTIDADE</small>
                  <strong>Sessão server-side</strong>
                  <span>authorization context e capabilities</span>
                </div>
                <span className={styles.flowArrow} aria-hidden="true">
                  ↓
                </span>
                <div className={styles.appRail} aria-label="Aplicações alvo">
                  <span>Hub</span>
                  <span>Spot</span>
                  <span>Seumei</span>
                  <span>Contracts</span>
                  <span>WillDash</span>
                </div>
                <span className={styles.flowArrow} aria-hidden="true">
                  ↓
                </span>
                <div className={styles.node} data-tone="success">
                  <small>INTEGRAÇÃO</small>
                  <strong>HTTP tipado + outbox</strong>
                  <span>idempotência, retry e rastreabilidade</span>
                </div>
                <span className={styles.flowArrow} aria-hidden="true">
                  ↓
                </span>
                <div className={styles.node} data-tone="success">
                  <small>DADOS</small>
                  <strong>Migrations + tenant FKs</strong>
                  <span>transação, índices e testes A/B</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.evidence} id="evidence" aria-labelledby="evidence-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>02 · Evidências</p>
              <h2 id="evidence-title">Cinco apps. Um produto ainda em formação.</h2>
            </div>
            <p>
              Capturas produzidas no ambiente local em navegador real, após autenticação pelos
              fluxos mock de cada aplicação.
            </p>
          </div>

          <div className={styles.evidenceGrid}>
            {evidence.map((item, index) => (
              <figure
                className={index === 0 ? styles.evidenceFeatured : styles.evidenceItem}
                key={item.src}
              >
                <div className={styles.screenshotFrame}>
                  <div className={styles.browserBar} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <small>localhost:{index === 0 || index === 5 ? "3000" : 3000 + index}</small>
                  </div>
                  <Image
                    src={item.src}
                    alt={`Captura local: ${item.app} — ${item.title}`}
                    width={1440}
                    height={1050}
                    sizes={index === 0 ? "100vw" : "(max-width: 800px) 100vw, 50vw"}
                  />
                </div>
                <figcaption>
                  <span>{item.app}</span>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          <aside className={styles.runtimeNote}>
            <span>Runtime note</span>
            <p>
              Lint, typecheck, seis schemas Prisma e os cinco builds passaram após geração manual.
              Em clone limpo, a primeira execução falhou porque o script de generate não cria todos
              os clients.
            </p>
          </aside>
        </section>

        <section className={styles.roadmap} id="roadmap" aria-labelledby="roadmap-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>03 · Plano de evolução</p>
              <h2 id="roadmap-title">Os próximos 30 passos.</h2>
            </div>
            <p>
              Sequência recomendada para um time de 2–3 engenheiros. As janelas são indicativas; os
              critérios de saída importam mais que a data.
            </p>
          </div>

          <nav className={styles.phaseNav} aria-label="Fases do roadmap">
            {phases.map((phase) => (
              <a href={`#${phase.id}`} key={phase.id}>
                {phase.label}
              </a>
            ))}
          </nav>

          <div className={styles.phaseList}>
            {phases.map((phase) => (
              <section
                className={styles.phase}
                id={phase.id}
                key={phase.id}
                style={{ "--phase-color": phase.color } as CSSProperties}
                aria-labelledby={`${phase.id}-title`}
              >
                <header className={styles.phaseHeader}>
                  <div>
                    <p>{phase.window}</p>
                    <h3 id={`${phase.id}-title`}>{phase.label}</h3>
                  </div>
                  <p>{phase.objective}</p>
                </header>

                <ol className={styles.stepList} start={phase.steps[0]?.number}>
                  {phase.steps.map((step) => (
                    <li className={styles.step} key={step.number}>
                      <span className={styles.stepNumber} aria-hidden="true">
                        {String(step.number).padStart(2, "0")}
                      </span>
                      <div className={styles.stepBody}>
                        <div className={styles.stepTitle}>
                          <h4>{step.title}</h4>
                          <span data-priority={step.priority}>{step.priority}</span>
                        </div>
                        <p>{step.reason}</p>
                        <dl>
                          <div>
                            <dt>Saída verificável</dt>
                            <dd>{step.output}</dd>
                          </div>
                          <div>
                            <dt>Esforço</dt>
                            <dd>{step.effort}</dd>
                          </div>
                          <div>
                            <dt>Depende de</dt>
                            <dd>{step.dependency}</dd>
                          </div>
                        </dl>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>

        <section className={styles.exitCriteria} aria-labelledby="exit-title">
          <p className={styles.kicker}>Critério de saída</p>
          <h2 id="exit-title">
            A plataforma começa quando o caminho crítico deixa de ser uma promessa.
          </h2>
          <div>
            <p>
              Um tenant autenticado cria uma gig no Spot, gera um contrato em Contracts, persiste o
              vínculo e produz um evento observável.
            </p>
            <p>
              Outro tenant não consegue ler, alterar ou descobrir qualquer parte desse fluxo — nem
              por UI, API, banco ou MCP.
            </p>
            <p>
              O cenário nasce de um clone limpo, passa na CI e pode ser reproduzido por uma nova
              pessoa sem conhecimento tribal.
            </p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>Matriz Infra Hub · Architecture Audit</span>
        <a href="#top">Voltar ao topo ↑</a>
      </footer>
    </div>
  )
}
