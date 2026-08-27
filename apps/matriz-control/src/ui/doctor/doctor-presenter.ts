import type { DoctorSnapshot, ResourceStatus } from "../../domain/doctor"

export function formatBytes(bytes: number | null) {
  if (bytes === null) return "indisponível"
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}
const statusLabel: Record<ResourceStatus, string> = { healthy: "saudável", warning: "atenção", critical: "crítico", unknown: "indisponível" }
export function toDoctorViewModel(snapshot: DoctorSnapshot) {
  return {
    generatedAt: snapshot.generatedAt,
    drive: { total: formatBytes(snapshot.drive.totalBytes), free: formatBytes(snapshot.drive.freeBytes), status: snapshot.drive.status, statusLabel: statusLabel[snapshot.drive.status] },
    projects: snapshot.projects.map((project) => ({ id: project.id, name: project.name, route: project.route, total: formatBytes(project.totalBytes), cache: formatBytes(project.cacheBytes), memory: formatBytes(project.memoryBytes), branch: project.branch, dirty: project.dirty, status: project.status, statusLabel: statusLabel[project.status], cacheTargets: project.cacheTargets.map((target) => ({ ...target, size: formatBytes(target.bytes) })) })),
  }
}
export type DoctorViewModel = ReturnType<typeof toDoctorViewModel>
