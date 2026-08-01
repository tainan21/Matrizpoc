import { createProjectBlueprintAction } from "../../../actions"

export default function NewProjectPage() {
  return (
    <main className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Project Blueprint</p>
          <h1>Planejar projeto</h1>
          <p>
            Gere uma prévia contract-first e uma solicitação Codex. Nenhum
            código-fonte será criado por este formulário.
          </p>
        </div>
      </header>
      <section className="composer" aria-labelledby="blueprint-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Prévia + aprovação</p>
            <h2 id="blueprint-title">Configuração mínima</h2>
          </div>
        </div>
        <form action={createProjectBlueprintAction} className="form-grid">
          <label>
            Nome
            <input name="name" required maxLength={120} placeholder="Matriz Sites" />
          </label>
          <label>
            Modo
            <select name="mode" defaultValue="create">
              <option value="create">Criar novo projeto</option>
              <option value="adopt">Adotar projeto existente</option>
            </select>
          </label>
          <label>
            Tipo
            <select name="projectKind" defaultValue="application">
              <option value="application">Aplicação</option>
              <option value="library">Biblioteca</option>
              <option value="site_collection">Coleção de sites</option>
              <option value="tooling">Tooling</option>
              <option value="external_repository">Repositório externo</option>
            </select>
          </label>
          <label>
            Template
            <select name="templateId" defaultValue="application-next">
              <option value="application-next">Next.js contract-first</option>
              <option value="library-typescript">Biblioteca TypeScript</option>
              <option value="site-collection-next">Coleção de sites Next.js</option>
              <option value="adopt-existing">Adotar sem reorganizar</option>
            </select>
          </label>
          <label className="wide">
            Destino
            <input name="target" required placeholder="apps/example-project" />
          </label>
          <label>
            Plataformas
            <input name="platforms" placeholder="web, pwa" />
          </label>
          <label>
            Domínios proprietários
            <input name="ownedDomains" placeholder="catalog, billing" />
          </label>
          <label>
            Capacidades consumidas
            <input name="consumedCapabilities" placeholder="identity, notifications" />
          </label>
          <label>
            Candidatos compartilháveis
            <input name="sharedCandidates" placeholder="metadata-presets" />
          </label>
          <label className="wide">
            Comandos de validação, um por linha
            <textarea
              name="validationCommands"
              rows={4}
              required
              defaultValue={"pnpm --filter <package> lint\npnpm --filter <package> typecheck"}
            />
          </label>
          <div className="form-actions wide">
            <button className="button primary" type="submit">
              Criar blueprint e tarefa
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
