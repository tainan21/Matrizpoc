/**
 * @matriz/flows-onboarding
 *
 * Onboarding compartilhado. Define steps globais (tenant, branding, apps
 * habilitados, operacao) e um registro de extensoes por app.
 *
 * Cada app registra seu proprio step especifico via registerAppStep. O app
 * tambem declara em seu manifest que participates=true (L2).
 *
 * Dados ficam persistidos via KeyValueStore (localStorage/in-memory) com
 * shape compativel com futuro Prisma (OnboardingProgress em core.prisma).
 */
import type { AppId } from "@matriz/foundation-types"
import type {
  SharedOnboardingPayload,
  SpotOnboardingPayload,
  SeumeiOnboardingPayload,
  ContractsOnboardingPayload,
  WilldashOnboardingPayload,
} from "@matriz/integration-api-contracts"
import {
  sharedOnboardingPayloadSchema,
  appOnboardingPayloadSchemas,
} from "@matriz/integration-api-contracts"
import { nowIso } from "@matriz/foundation-utils"
import type { KeyValueStore } from "@matriz/platform-storage"
import { z } from "zod"

// ---------- step definitions ----------

export type SharedStepId =
  | "tenant-basics"
  | "branding"
  | "apps-selection"
  | "operation-basics"

export const SHARED_STEP_ORDER: readonly SharedStepId[] = [
  "tenant-basics",
  "branding",
  "apps-selection",
  "operation-basics",
]

export interface SharedStepDefinition {
  id: SharedStepId
  title: string
  description: string
  order: number
}

export const sharedSteps: readonly SharedStepDefinition[] = [
  {
    id: "tenant-basics",
    title: "Dados da organizacao",
    description: "Nome, pais e informacoes legais basicas do tenant.",
    order: 1,
  },
  {
    id: "branding",
    title: "Branding",
    description: "Cor principal, acento e texto da logo.",
    order: 2,
  },
  {
    id: "apps-selection",
    title: "Apps habilitados",
    description: "Escolha quais apps da Matriz vao participar.",
    order: 3,
  },
  {
    id: "operation-basics",
    title: "Operacao",
    description: "Timezone, moeda e idioma padrao.",
    order: 4,
  },
]

// ---------- per-app extension registry ----------

export interface AppOnboardingStep<TPayload = unknown> {
  appId: AppId
  title: string
  description: string
  payloadSchema: z.ZodType<TPayload>
}

const appSteps = new Map<AppId, AppOnboardingStep<unknown>>()

export function registerAppStep<A extends AppId>(
  appId: A,
  step: Omit<AppOnboardingStep<unknown>, "appId">,
): void {
  appSteps.set(appId, { ...step, appId })
}

export function getRegisteredAppStep(appId: AppId): AppOnboardingStep | undefined {
  return appSteps.get(appId)
}

export function listRegisteredAppSteps(): readonly AppOnboardingStep[] {
  return Array.from(appSteps.values())
}

export function clearRegisteredAppSteps(): void {
  appSteps.clear()
}

// ---------- progress shape + persistence ----------

export interface OnboardingProgress {
  tenantId: string
  startedAt: string
  completedAt?: string
  currentStep: SharedStepId | AppId | "summary"
  shared?: Partial<SharedOnboardingPayload>
  perApp: Partial<{
    spot: SpotOnboardingPayload
    seumei: SeumeiOnboardingPayload
    contracts: ContractsOnboardingPayload
    willdash: WilldashOnboardingPayload
    "matriz-hub": Record<string, never>
  }>
}

export const onboardingProgressSchema = z.object({
  tenantId: z.string().min(1),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  currentStep: z.string().min(1),
  shared: sharedOnboardingPayloadSchema.partial().optional(),
  perApp: z.record(z.string(), z.unknown()).default({}),
})

const STORE_KEY = (tenantId: string) => `matriz.onboarding.progress.${tenantId}`

export interface OnboardingStore {
  load(tenantId: string): OnboardingProgress | undefined
  save(progress: OnboardingProgress): OnboardingProgress
  start(tenantId: string): OnboardingProgress
  complete(tenantId: string): OnboardingProgress | undefined
  saveAppPayload<A extends AppId>(
    tenantId: string,
    appId: A,
    payload: unknown,
  ): OnboardingProgress
  saveShared(
    tenantId: string,
    partial: Partial<SharedOnboardingPayload>,
  ): OnboardingProgress
  isCompleted(tenantId: string): boolean
}

export function createOnboardingStore(persistence?: KeyValueStore): OnboardingStore {
  const load = (tenantId: string): OnboardingProgress | undefined => {
    if (!persistence) return undefined
    return persistence.get<OnboardingProgress>(STORE_KEY(tenantId))
  }

  const save = (progress: OnboardingProgress): OnboardingProgress => {
    if (persistence) persistence.set(STORE_KEY(progress.tenantId), progress)
    return progress
  }

  return {
    load,
    save,
    start(tenantId) {
      const existing = load(tenantId)
      if (existing) return existing
      const progress: OnboardingProgress = {
        tenantId,
        startedAt: nowIso(),
        currentStep: "tenant-basics",
        perApp: {},
      }
      return save(progress)
    },
    complete(tenantId) {
      const existing = load(tenantId)
      if (!existing) return undefined
      return save({ ...existing, completedAt: nowIso(), currentStep: "summary" })
    },
    saveAppPayload(tenantId, appId, payload) {
      const schema = appOnboardingPayloadSchemas[appId] as z.ZodType<unknown>
      const parsed = schema.parse(payload)
      const existing =
        load(tenantId) ??
        ({
          tenantId,
          startedAt: nowIso(),
          currentStep: appId,
          perApp: {},
        } satisfies OnboardingProgress)
      return save({
        ...existing,
        perApp: { ...existing.perApp, [appId]: parsed },
      })
    },
    saveShared(tenantId, partial) {
      const existing =
        load(tenantId) ??
        ({
          tenantId,
          startedAt: nowIso(),
          currentStep: "tenant-basics",
          perApp: {},
        } satisfies OnboardingProgress)
      return save({
        ...existing,
        shared: { ...existing.shared, ...partial },
      })
    },
    isCompleted(tenantId) {
      const p = load(tenantId)
      return Boolean(p?.completedAt)
    },
  }
}

// ---------- global singleton store (shared across features) ----------

let globalStore: OnboardingStore | undefined

/**
 * Retorna o store global de onboarding. No primeiro acesso cria um store
 * in-memory. Pode ser sobrescrito chamando {@link setGlobalOnboardingStore}
 * no bootstrap do app para injetar persistencia (localStorage, etc).
 */
export function getGlobalOnboardingStore(): OnboardingStore {
  if (!globalStore) globalStore = createOnboardingStore()
  return globalStore
}

export function setGlobalOnboardingStore(store: OnboardingStore): void {
  globalStore = store
}

export const FLOWS_ONBOARDING_VERSION = "1.0.0" as const
