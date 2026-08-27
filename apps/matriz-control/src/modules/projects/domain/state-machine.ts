import type { ProjectState } from "./project"

const transitions: Readonly<Record<ProjectState, readonly ProjectState[]>> = {
  unknown: ["inspecting", "blocked", "failed"],
  inspecting: ["needs_review", "blocked", "failed"],
  needs_review: ["ready", "inspecting", "blocked", "failed"],
  ready: ["preparing", "starting", "needs_review", "blocked", "failed"],
  preparing: ["ready", "blocked", "failed"],
  starting: ["running", "degraded", "stopping", "failed"],
  running: ["degraded", "stopping", "needs_review", "failed"],
  degraded: ["running", "stopping", "needs_review", "failed"],
  stopping: ["stopped", "failed"],
  stopped: ["starting", "needs_review", "inspecting", "blocked", "failed"],
  blocked: ["inspecting", "needs_review", "ready", "stopped", "failed"],
  failed: ["inspecting", "needs_review", "ready", "stopped"],
}

export function transitionProject(from: ProjectState, to: ProjectState): ProjectState {
  if (!transitions[from].includes(to)) throw new Error(`Invalid project transition: ${from} -> ${to}`)
  return to
}
