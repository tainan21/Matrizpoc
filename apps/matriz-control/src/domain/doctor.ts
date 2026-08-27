export type ResourceStatus = "healthy" | "warning" | "critical" | "unknown"
export interface DriveMetric { totalBytes: number | null; freeBytes: number | null; status: ResourceStatus }
export interface CacheTargetMetric { id: "next" | "turbo"; bytes: number; reclaimable: boolean }
export interface ProjectResourceMetric { id: string; name: string; route: string; totalBytes: number | null; cacheBytes: number | null; memoryBytes: number | null; branch: string | null; dirty: boolean | null; status: ResourceStatus; cacheTargets: CacheTargetMetric[] }
export interface DoctorSnapshot { generatedAt: string; drive: DriveMetric; projects: ProjectResourceMetric[] }
export interface ProcessMetric { pid: number; parentPid: number; memoryBytes: number }
