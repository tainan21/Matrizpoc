export const AGENT_HANDBOOK_PATH =
  "apps/matriz-workbench/docs/agent-handbook/README.md"

export const AGENT_OPERATING_SUMMARY = `Matriz Workbench operating contract:
- Read AGENTS.md and ${AGENT_HANDBOOK_PATH} before changing the Workbench.
- Treat roadmap, backlog, activity and score as different artifacts.
- A change may be recorded without changing the score.
- Award one point only for an observable outcome with reviewable evidence.
- Never weaken security or hide a regression to preserve the score.
- Work in the smallest scope and never import another app's internals.
- Human + Codex is the primary flow; use auxiliary agents only for independent bounded work.
- Code changes use normal Codex permissions. Workbench tools only manage named workflow artifacts.
- Complete work with summary, changed files, checks and the next pending state.`

export function getAgentOperatingGuide() {
  return {
    version: 1,
    handbookPath: AGENT_HANDBOOK_PATH,
    scoreModel: {
      scale: "0-100",
      goals: 100,
      values: [0, 1],
      oneOfNinetyNine:
        "Human shorthand for one evidenced point and ninety-nine open points; not a second scale.",
    },
    primaryCollaboration: "human + Codex",
    multiagentPolicy: "optional, explicit and limited to independent bounded work",
    summary: AGENT_OPERATING_SUMMARY,
  }
}
