import Link from "next/link"
import { notFound } from "next/navigation"
import {
  describeNextAdoptionAction,
  getPackageAdoptionReadiness,
} from "../../../../src/application/library-adoption-readiness"
import { FederatedSourceRepository } from "../../../../src/integration/filesystem/federated-source-repository"
import { LibraryAdoptionPolicyRepository } from "../../../../src/integration/filesystem/library-adoption-policy-repository"
import { WorkspaceRepository } from "../../../../src/integration/filesystem/workspace-repository"

export default async function SourceKnowledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceId: string }>
  searchParams: Promise<{ document?: string; package?: string }>
}) {
  const { sourceId } = await params
  const {
    document: selectedPath,
    package: selectedPackageName,
  } = await searchParams
  const workspace = await WorkspaceRepository.create()
  const repository = await FederatedSourceRepository.create(
    workspace.repositoryRoot,
  )
  const source = (await repository.listSources()).find(
    (item) => item.id === sourceId,
  )
  if (!source?.available) notFound()
  const [documents, sourceSummary] = await Promise.all([
    repository.listDocuments(sourceId),
    repository.getSourceSummary(sourceId),
  ])
  const selected = selectedPath
    ? await repository.readDocument(sourceId, selectedPath).catch(() => undefined)
    : undefined
  const selectedPackage = selectedPackageName
    ? await repository
        .getPackageSummary(sourceId, selectedPackageName)
        .catch(() => undefined)
    : undefined
  const adoptionPolicies = selectedPackage
    ? await LibraryAdoptionPolicyRepository.create(
        workspace.repositoryRoot,
      ).catch(() => undefined)
    : undefined
  const readiness =
    selectedPackage && adoptionPolicies
      ? await getPackageAdoptionReadiness(
          workspace.repositoryRoot,
          repository,
          adoptionPolicies,
          sourceId,
          selectedPackage.name,
        ).catch(() => undefined)
      : undefined
  const nextAdoptionAction = selectedPackage
    ? describeNextAdoptionAction(readiness)
    : undefined

  return (
    <main className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Fonte externa · somente leitura</p>
          <h1>{source.name}</h1>
          <p>{documents.length} documentos permitidos no catálogo local.</p>
        </div>
        <Link className="button ghost" href="/knowledge">Todas as fontes</Link>
      </header>
      <section className="inventory-summary" aria-label="Resumo da fonte">
        <div>
          <strong>{sourceSummary.packageName ?? "sem package"}</strong>
          <span>package raiz</span>
        </div>
        <div>
          <strong>{sourceSummary.version ?? "privado"}</strong>
          <span>versão declarada</span>
        </div>
        <div>
          <strong>{sourceSummary.packages.length}</strong>
          <span>packages declarados</span>
        </div>
        <div>
          <strong>{sourceSummary.scripts.length}</strong>
          <span>scripts disponíveis</span>
        </div>
      </section>
      {sourceSummary.packages.length > 0 ? (
        <section className="settings-list" aria-label="Packages da fonte">
          {sourceSummary.packages.map((item) => (
            <div key={item.name}>
              <Link
                href={`/knowledge/${sourceId}?package=${encodeURIComponent(item.name)}`}
              >
                {item.name}
              </Link>
              <strong>{item.version ?? "sem versão"}</strong>
            </div>
          ))}
        </section>
      ) : null}
      {selectedPackage ? (
        <section className="package-contract" aria-label="Contrato do package">
          <header className="section-heading">
            <div>
              <p className="eyebrow">Contrato read-only</p>
              <h2>{selectedPackage.name}</h2>
            </div>
            <span>{selectedPackage.version ?? "sem versão"}</span>
          </header>
          <dl>
            <div>
              <dt>Exports</dt>
              <dd>{selectedPackage.exports.join(", ") || "nenhum declarado"}</dd>
            </div>
            <div>
              <dt>Dependências</dt>
              <dd>{selectedPackage.dependencies.join(", ") || "nenhuma"}</dd>
            </div>
            <div>
              <dt>Peers</dt>
              <dd>{selectedPackage.peerDependencies.join(", ") || "nenhum"}</dd>
            </div>
            <div>
              <dt>Checks</dt>
              <dd>{selectedPackage.scripts.join(", ") || "nenhum declarado"}</dd>
            </div>
          </dl>
        </section>
      ) : null}
      {selectedPackageName && !selectedPackage ? (
        <section className="package-selection-state" aria-live="polite">
          <div className="empty-inline">
            <strong>Package não encontrado</strong>
            <span>
              Selecione um package publicado pela fonte para consultar seu
              contrato e gate de adoção.
            </span>
            <Link href={`/knowledge/${sourceId}`}>Voltar ao catálogo</Link>
          </div>
        </section>
      ) : null}
      {!selectedPackageName && sourceSummary.packages.length > 0 ? (
        <section className="package-selection-state">
          <div className="empty-inline">
            <strong>Selecione um package</strong>
            <span>
              O contrato e o gate de adoção serão carregados somente para o
              item escolhido.
            </span>
          </div>
        </section>
      ) : null}
      {selectedPackage ? (
        <section className="adoption-gate" aria-labelledby="adoption-gate-title">
          <header className="section-heading">
            <div>
              <p className="eyebrow">Gate de adoção</p>
              <h2 id="adoption-gate-title">
                {readiness?.ready
                  ? "Pronto para adoção"
                  : "Ainda não adotável"}
              </h2>
            </div>
            <span
              className={`status-chip ${
                readiness?.ready
                  ? "success"
                  : readiness?.status === "blocked"
                    ? "blocked"
                    : readiness?.status === "candidate" ||
                        readiness?.status === "approved"
                      ? "review"
                      : "muted-status"
              }`}
            >
              {readiness?.status === "not_configured"
                ? "não configurado"
                : readiness?.status === "candidate"
                  ? "candidato"
                  : readiness?.status === "approved"
                    ? "aprovado"
                    : readiness?.status === "blocked"
                      ? "bloqueado"
                      : "indisponível"}
            </span>
          </header>
          <dl>
            <div>
              <dt>Decisão</dt>
              <dd>
                {readiness?.ready
                  ? "Todos os critérios foram comprovados."
                  : readiness?.status === "not_configured"
                    ? "Nenhuma política de adoção foi configurada para este package."
                    : readiness
                      ? "Adoção bloqueada até cumprir o contrato."
                      : "Não foi possível ler a política de adoção."}
              </dd>
            </div>
            <div>
              <dt>Subpaths permitidos</dt>
              <dd>
                <ul>
                  {(readiness?.allowedSubpaths.length
                    ? readiness.allowedSubpaths
                    : ["nenhum definido"]
                  ).map((item) => <li key={item}><code>{item}</code></li>)}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Critérios ausentes</dt>
              <dd>
                <ul>
                  {(readiness?.missing.length
                    ? readiness.missing
                    : ["nenhum"]
                  ).map((item) => <li key={item}><code>{item}</code></li>)}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Critérios comprovados</dt>
              <dd>
                <ul>
                  {(readiness?.satisfied.length
                    ? readiness.satisfied
                    : ["nenhum"]
                  ).map((item) => <li key={item}><code>{item}</code></li>)}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Bloqueadores</dt>
              <dd>
                <ul>
                  {(readiness?.blockers.length
                    ? readiness.blockers
                    : ["nenhum"]
                  ).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </dd>
            </div>
            <div className="wide">
              <dt>Próxima ação</dt>
              <dd>{nextAdoptionAction}</dd>
            </div>
            <div className="wide">
              <dt>Evidências</dt>
              <dd>
                <ul>
                  {(readiness?.evidence.length
                    ? readiness.evidence
                    : ["nenhuma referência"]
                  ).map((item) => <li key={item}><code>{item}</code></li>)}
                </ul>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
      <section className="docs-layout">
        <div className="docs-index">
          <div className="section-heading">
            <h2>Documentos</h2><span>{documents.length}</span>
          </div>
          {documents.map((document) => (
            <Link
              href={`/knowledge/${sourceId}?document=${encodeURIComponent(document.path)}`}
              key={document.path}
            >
              <span className="doc-icon">MD</span>
              <span>
                <strong>{document.title}</strong>
                <small>{document.status} · {document.path}</small>
              </span>
              <time>{Math.max(1, Math.ceil(document.bytes / 1024))} KB</time>
            </Link>
          ))}
        </div>
        <article className="document-reader">
          {selected ? (
            <>
              <header>
                <p className="eyebrow">{selected.status} · {selected.path}</p>
                <h2>{selected.title}</h2>
              </header>
              <pre className="prompt-preview">{selected.content}</pre>
            </>
          ) : (
            <div className="empty-inline">
              <strong>Selecione um documento</strong>
              <span>O conteúdo completo não é carregado na listagem.</span>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}
