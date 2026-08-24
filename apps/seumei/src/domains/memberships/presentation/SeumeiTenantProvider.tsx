"use client"

import * as React from "react"
import { asUserId } from "@matriz/foundation-types"
import { createDefaultStore, type KeyValueStore } from "@matriz/platform-storage"
import { useAuth } from "@matriz/platform-auth/client"
import type { CompanyId } from "../../companies/domain/company"
import type {
  BusinessOsService,
  CompanyWorkspace,
} from "../../hub/application/hub.service"
import type { HubViewModel } from "../../hub/presentation/hub.presenter"
import { isSeumeiDemoAccount } from "../../login/application/demo-account"
import { createDemoBusinessOs } from "../../../lib/container"

const UNASSIGNED_DEMO_FIXTURE_USER = asUserId("seumei-demo-fixture-owner")

export type SeumeiTenantStatus = "loading" | "ready" | "empty"

export interface SeumeiTenantState {
  readonly status: SeumeiTenantStatus
  readonly hub: HubViewModel | null
  readonly current: CompanyWorkspace | null
  readonly error: string | null
  switchCompany(companyId: CompanyId): Promise<boolean>
}

const SeumeiTenantContext = React.createContext<SeumeiTenantState | null>(null)
SeumeiTenantContext.displayName = "SeumeiTenantContext"

function serviceForSession(
  userId: Parameters<typeof createDemoBusinessOs>[0],
  email: string,
): BusinessOsService {
  return createDemoBusinessOs(
    isSeumeiDemoAccount(email) ? userId : UNASSIGNED_DEMO_FIXTURE_USER,
  )
}

function selectedCompanyKey(userId: string) {
  return `selected-company:${userId}`
}

export function SeumeiTenantProvider({
  children,
  storage,
}: {
  readonly children: React.ReactNode
  readonly storage?: KeyValueStore
}) {
  const { session } = useAuth()
  const store = React.useMemo(
    () => storage ?? createDefaultStore("seumei:tenant-selection:v1"),
    [storage],
  )
  const service = React.useMemo(
    () =>
      session
        ? serviceForSession(session.identity.user.id, session.identity.user.email)
        : null,
    [session],
  )
  const [status, setStatus] = React.useState<SeumeiTenantStatus>("loading")
  const [hub, setHub] = React.useState<HubViewModel | null>(null)
  const [current, setCurrent] = React.useState<CompanyWorkspace | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    if (!session || !service) return
    setStatus("loading")
    void service.getHub(session.identity.user.id).then(async (nextHub) => {
      if (!active) return
      setHub(nextHub)
      if (nextHub.companies.length === 0) {
        setCurrent(null)
        setStatus("empty")
        return
      }
      const storedId = store.get<string>(selectedCompanyKey(session.identity.user.id))
      const selected =
        nextHub.companies.find((company) => company.id === storedId) ??
        nextHub.companies[0]!
      const opened = await service.openCompany(
        session.identity.user.id,
        selected.id as CompanyId,
      )
      if (!active) return
      if (!opened.ok) {
        setError("Empresa não disponível para esta conta.")
        setStatus("empty")
        return
      }
      setCurrent(opened.workspace)
      setStatus("ready")
    })
    return () => {
      active = false
    }
  }, [service, session, store])

  const switchCompany = React.useCallback(
    async (companyId: CompanyId) => {
      if (!session || !service) return false
      const opened = await service.openCompany(session.identity.user.id, companyId)
      if (!opened.ok) {
        setError("Empresa não disponível para esta conta.")
        return false
      }
      setCurrent(opened.workspace)
      setError(null)
      setStatus("ready")
      store.set(selectedCompanyKey(session.identity.user.id), companyId)
      return true
    },
    [service, session, store],
  )

  const value = React.useMemo<SeumeiTenantState>(
    () => ({ status, hub, current, error, switchCompany }),
    [status, hub, current, error, switchCompany],
  )

  return (
    <SeumeiTenantContext.Provider value={value}>
      {children}
    </SeumeiTenantContext.Provider>
  )
}

export function useSeumeiTenant(): SeumeiTenantState {
  const value = React.useContext(SeumeiTenantContext)
  if (!value) {
    throw new Error("useSeumeiTenant must be used inside SeumeiTenantProvider")
  }
  return value
}
