import type { CSSProperties } from "react"
import type { Roadmap, RoadmapGoalCategory } from "../../domain/schemas"
import {
  initializeRoadmapScorecardAction,
  initializeRoadmapScorecardsAction,
  reconcileRoadmapScoreAction,
  toggleRoadmapGoalAction,
  toggleRoadmapScorecardGoalAction,
} from "../../../app/actions"

const CATEGORY_LABELS: Record<RoadmapGoalCategory, string> = {
  vision: "Visão",
  product: "Produto",
  architecture: "Arquitetura",
  design: "Design",
  experience: "Experiência",
  quality: "Qualidade",
  security: "Segurança",
  performance: "Performance",
  collaboration: "Colaboração",
  scale: "Escala",
}

export function RoadmapScorecard({
  projectId,
  roadmap,
}: {
  projectId: string
  roadmap: Roadmap
}) {
  const goals = [...roadmap.goals].sort((a, b) => a.ordinal - b.ordinal)
  const completed = goals.filter((goal) => goal.score === 1).length
  const nextGoals = goals.filter((goal) => goal.score === 0).slice(0, 5)

  if (!goals.length) {
    if (["matriz-workbench", "matriz-infra-hub"].includes(projectId)) return null
    return (
      <section className="scorecard-empty">
        <span className="score-kicker">Método binário · 0 ou 1</span>
        <h2>Crie uma trilha objetiva de 0 a 100</h2>
        <p>
          Cem metas pequenas tornam evolução, design, arquitetura e colaboração visíveis sem
          fabricar percentuais subjetivos.
        </p>
        <form action={initializeRoadmapScorecardAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="revision" value={roadmap.revision} />
          <button className="button primary" type="submit">Criar trilha 0–100</button>
        </form>
      </section>
    )
  }

  return (
    <section className="scorecard" aria-labelledby="scorecard-title">
      <div className="scorecard-summary">
        <div>
          <span className="score-kicker">Progresso verificável</span>
          <h2 id="scorecard-title"><strong>{completed}</strong><span>/100</span></h2>
          <p>Cada ponto vale 1 somente quando existe resultado observável.</p>
          {projectId === "matriz-workbench" ? (
            <form action={reconcileRoadmapScoreAction} className="score-audit-action">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="revision" value={roadmap.revision} />
              <button className="button ghost" type="submit">Revalidar evidências</button>
            </form>
          ) : null}
        </div>
        <div className="score-progress" aria-label={`${completed} de 100 metas concluídas`}>
          <i style={{ "--score": `${completed}%` } as CSSProperties} />
          <span>{100 - completed} pontos restantes</span>
        </div>
      </div>

      <div className="goal-matrix" aria-label="Mapa das 100 metas">
        {goals.map((goal) => (
          <form action={toggleRoadmapGoalAction} key={goal.id}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="goalId" value={goal.id} />
            <input type="hidden" name="revision" value={roadmap.revision} />
            <button
              aria-label={`Meta ${goal.ordinal}: ${goal.title}. ${goal.score ? "Concluída" : "Pendente"}`}
              className={goal.score ? "goal-point complete" : "goal-point"}
              title={`${goal.ordinal}. ${goal.title}`}
              type="submit"
            >
              {goal.ordinal}
            </button>
          </form>
        ))}
      </div>

      <div className="scorecard-detail">
        <div>
          <span className="score-kicker">Próximos pontos</span>
          {nextGoals.map((goal) => (
            <div className="next-goal" key={goal.id}>
              <span>{String(goal.ordinal).padStart(2, "0")}</span>
              <strong>{goal.title}</strong>
              <small>{CATEGORY_LABELS[goal.category]}</small>
            </div>
          ))}
        </div>
        <details>
          <summary>Ver todas as metas</summary>
          {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
            const categoryGoals = goals.filter((goal) => goal.category === category)
            return (
              <section className="goal-group" key={category}>
                <h3>{label}<span>{categoryGoals.filter((goal) => goal.score).length}/10</span></h3>
                {categoryGoals.map((goal) => (
                  <div className={goal.score ? "goal-row complete" : "goal-row"} key={goal.id}>
                    <span>{String(goal.ordinal).padStart(2, "0")}</span>
                    <strong title={goal.evidence.join("\n")}>{goal.title}</strong>
                    <span>{goal.score ? "1" : "0"}</span>
                  </div>
                ))}
              </section>
            )
          })}
        </details>
      </div>
    </section>
  )
}

export function RoadmapScorecardCollection({
  projectId,
  roadmap,
}: {
  projectId: string
  roadmap: Roadmap
}) {
  const supportsSpecializedTracks = ["matriz-workbench", "matriz-infra-hub"].includes(projectId)

  if (!roadmap.scorecards.length) {
    if (!supportsSpecializedTracks) return null
    return (
      <section className="scorecard-tracks-empty">
        <div>
          <span className="score-kicker">Escopos independentes</span>
          <h2>Dividir o progresso sem diluir responsabilidade</h2>
          <p>
            Cada trilha possui cem outcomes próprios. Concluir documentação não aumenta
            artificialmente o score do aplicativo ou das features.
          </p>
        </div>
        <form action={initializeRoadmapScorecardsAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="revision" value={roadmap.revision} />
          <button className="button primary" type="submit">Criar trilhas especializadas</button>
        </form>
      </section>
    )
  }

  return (
    <section className="scorecard-tracks" aria-labelledby="scorecard-tracks-title">
      <header>
        <div>
          <span className="score-kicker">Trilhas especializadas</span>
          <h2 id="scorecard-tracks-title">Progresso por responsabilidade</h2>
        </div>
        {supportsSpecializedTracks ? (
          <form action={initializeRoadmapScorecardsAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="revision" value={roadmap.revision} />
            <button className="button ghost" type="submit">Verificar trilhas</button>
          </form>
        ) : null}
      </header>
      {roadmap.scorecards.map((scorecard) => {
        const completed = scorecard.goals.filter((goal) => goal.score === 1).length
        const nextGoals = scorecard.goals.filter((goal) => goal.score === 0).slice(0, 4)
        return (
          <details className="scorecard-track" key={scorecard.id}>
            <summary>
              <span>
                <strong>{scorecard.title}</strong>
                <small>{scorecard.description}</small>
              </span>
              <b>{completed}<i>/100</i></b>
            </summary>
            <div className="scorecard-track-progress" aria-label={`${completed} de 100`}>
              <i style={{ width: `${completed}%` }} />
            </div>
            <div className="scorecard-track-body">
              <div>
                <span className="score-kicker">Próximos pontos</span>
                {nextGoals.map((goal) => (
                  <div className="next-goal" key={goal.id}>
                    <span>{String(goal.ordinal).padStart(2, "0")}</span>
                    <strong>{goal.title}</strong>
                    <small>{CATEGORY_LABELS[goal.category]}</small>
                  </div>
                ))}
              </div>
              <div className="goal-matrix compact" aria-label={`Mapa da trilha ${scorecard.title}`}>
                {scorecard.goals.map((goal) => (
                  <form action={toggleRoadmapScorecardGoalAction} key={goal.id}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="scorecardId" value={scorecard.id} />
                    <input type="hidden" name="goalId" value={goal.id} />
                    <input type="hidden" name="revision" value={roadmap.revision} />
                    <button
                      aria-label={`Meta ${goal.ordinal}: ${goal.title}. ${goal.score ? "Concluída" : "Pendente"}`}
                      className={goal.score ? "goal-point complete" : "goal-point"}
                      title={`${goal.ordinal}. ${goal.title}`}
                      type="submit"
                    >
                      {goal.ordinal}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </details>
        )
      })}
    </section>
  )
}
