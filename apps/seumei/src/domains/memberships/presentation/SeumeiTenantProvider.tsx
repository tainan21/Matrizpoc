"use client"

import * as React from "react"
import { asUserId } from "@matriz/foundation-types"
import { createDefaultStore, type KeyValueStore } from "@matriz/platform-storage"
import { useAuth } from "@matriz/platform-auth/client"
import type { CompanyId } from "../../companies/domain/company"
import type { CompanyWorkspace } from "../../hub/application/hub.service"
import type { CatalogService } from "../../catalog/application/catalog.service"
import type { OrdersService } from "../../orders/application/orders.service"
import type { HubViewModel } from "../../hub/presentation/hub.presenter"
import { isSeumeiDemoAccount } from "../../login/application/demo-account"
import {
  createDemoSeumeiRuntime,
  type DemoSeumeiRuntime,
} from "../../../lib/container"

const UNASSIGNED_DEMO_FIXTURE_USER = asUserId("seumei-demo-fixture-owner")

export type SeumeiTenantStatus = "loading" | "ready" | "empty"

export interface SeumeiTenantState {
  readonly status: SeumeiTenantStatus
  readonly hub: HubViewModel | null
  readonly current: CompanyWorkspace | null
  readonly catalog: CatalogService | null
  readonly orders: OrdersService | null
  readonly error: string | null
  switchCompany(companyId: CompanyId): Promise<boolean>
}

const SeumeiTenantContext = React.createContext<SeumeiTenantState | null>(null)
SeumeiTenantContext.displayName = "SeumeiTenantContext"

function runtimeForSession(
  userId: Parameters<typeof createDemoSeumeiRuntime>[0],
  email: string,
  domainStorage: KeyValueStore,
): DemoSeumeiRuntime {
  return createDemoSeumeiRuntime(
    isSeumeiDemoAccount(email) ? userId : UNASSIGNED_DEMO_FIXTURE_USER,
    domainStorage,
  )
}

function selectedCompanyKey(userId: string) {
  return `selected-company:${userId}`
}

export function SeumeiTenantProvider({
  children,
  storage,
  domainStorage,
}: {
  readonly children: React.ReactNode
  readonly storage?: KeyValueStore
  readonly domainStorage?: KeyValueStore
}) {
  const { session } = useAuth()
  const store = React.useMemo(
    () => storage ?? createDefaultStore("seumei:tenant-selection:v1"),
    [storage],
  )
  const persistentDomainStore = React.useMemo(
    () => domainStorage ?? createDefaultStore("seumei:demo-domain:v2"),
    [domainStorage],
  )
  const runtime = React.useMemo(
    () =>
      session
        ? runtimeForSession(
            session.identity.user.id,
            session.identity.user.email,
            persistentDomainStore,
          )
        : null,
    [session, persistentDomainStore],
  )
  const [status, setStatus] = React.useState<SeumeiTenantStatus>("loading")
  const [hub, setHub] = React.useState<HubViewModel | null>(null)
  const [current, setCurrent] = React.useState<CompanyWorkspace | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    if (!session || !runtime) return
    setStatus("loading")
    void runtime.businessOs.getHub(session.identity.user.id).then(async (nextHub) => {
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
      const opened = await runtime.businessOs.openCompany(
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
  }, [runtime, session, store])

  const switchCompany = React.useCallback(
    async (companyId: CompanyId) => {
      if (!session || !runtime) return false
      const opened = await runtime.businessOs.openCompany(
        session.identity.user.id,
        companyId,
      )
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
    [runtime, session, store],
  )

  const value = React.useMemo<SeumeiTenantState>(
    () => ({
      status,
      hub,
      current,
      catalog: runtime?.catalog ?? null,
      orders: runtime?.ordersOperations ?? null,
      error,
      switchCompany,
    }),
    [status, hub, current, runtime, error, switchCompany],
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
