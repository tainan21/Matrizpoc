export const PROJECT_PERMISSIONS = [
  "project.inspect",
  "project.register",
  "project.dependencies.install",
  "project.process.start",
  "project.process.stop",
  "project.surface.embed",
  "project.surface.open_external",
  "project.logs.read",
  "project.environment.use_secret_ref",
  "project.docker.operate",
] as const

export type ProjectPermission = typeof PROJECT_PERMISSIONS[number]

export function hasProjectPermission(granted: readonly ProjectPermission[], required: ProjectPermission): boolean {
  return granted.includes(required)
}
