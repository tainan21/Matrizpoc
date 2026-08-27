import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { emptyInstalledAppsState, installApp } from "../../domain/installable-apps"
import { INSTALLABLE_APPS } from "../../integration/apps/installable-app-catalog"
import { toInstallableAppsViewModels } from "./installable-apps-presenter"
import { ExternalAppFrame, activateExternalApp, frameAppForActivation } from "./external-app-stage"
import { SmartAppRail } from "./smart-app-rail"

const appId = "health"
const allowedIds = INSTALLABLE_APPS.map((app) => app.manifest.appId)

function healthViewModel(installed = true) {
  const state = installed ? installApp(emptyInstalledAppsState(), appId, allowedIds) : emptyInstalledAppsState()
  return toInstallableAppsViewModels(INSTALLABLE_APPS, state)[0]!
}

describe("smart app host", () => {
  it("keeps the app switcher absent until an app is installed", () => {
    const withoutInstalledApps = renderToStaticMarkup(<SmartAppRail apps={[healthViewModel(false)]} activeAppId={null} onActivate={() => undefined} />)
    const withHealthInstalled = renderToStaticMarkup(<SmartAppRail apps={[healthViewModel()]} activeAppId={null} onActivate={() => undefined} />)

    expect(withoutInstalledApps).not.toContain('aria-label="Alternar apps"')
    expect(withHealthInstalled).toContain('aria-label="Alternar apps"')
  })

  it("exposes Health Overview and Resources only after Health is installed", () => {
    const markup = renderToStaticMarkup(<SmartAppRail apps={[healthViewModel()]} activeAppId="health" onActivate={() => undefined} onOpenPath={() => undefined} />)

    expect(markup).toContain("System Health")
    expect(markup).toContain("Overview")
    expect(markup).toContain("Resources")
  })

  it("renders exactly one external frame and removes it for Control", () => {
    const health = healthViewModel()
    const externalMarkup = renderToStaticMarkup(<ExternalAppFrame app={health} path="/resources" />)
    const controlMarkup = renderToStaticMarkup(<ExternalAppFrame app={null} />)

    expect((externalMarkup.match(/<iframe/g) ?? [])).toHaveLength(1)
    expect(externalMarkup).toContain('src="http://127.0.0.1:3010/resources"')
    expect(controlMarkup).not.toContain("<iframe")
  })

  it("waits for the visual transition and polls readiness only until the app is ready", async () => {
    const events: string[] = []
    const result = await activateExternalApp({
      app: healthViewModel(),
      signal: new AbortController().signal,
      openSession: async (projectId) => { events.push(`session:${projectId}`) },
      wait: async (milliseconds) => { events.push(`wait:${milliseconds}`) },
      checkReadiness: async () => { events.push("readiness"); return true },
    })

    expect(result).toBe("ready")
    expect(events).toEqual(["session:health", "wait:1000", "readiness"])
  })

  it("opens the catalogued project instead of deriving a process identifier in the host", async () => {
    const events: string[] = []
    const app = { ...healthViewModel(), projectId: "catalogued-health-project" }

    await activateExternalApp({
      app,
      signal: new AbortController().signal,
      openSession: async (projectId) => { events.push(projectId) },
      wait: async () => undefined,
      checkReadiness: async () => true,
    })

    expect(events).toEqual(["catalogued-health-project"])
  })

  it("stops readiness polling when a later selection cancels activation", async () => {
    const controller = new AbortController()
    const events: string[] = []
    const result = await activateExternalApp({
      app: healthViewModel(),
      signal: controller.signal,
      openSession: async () => { controller.abort() },
      wait: async () => { events.push("wait") },
      checkReadiness: async () => { events.push("readiness"); return true },
    })

    expect(result).toBe("cancelled")
    expect(events).toEqual([])
  })

  it("passes the selection signal to the terminal start request and cancels it before readiness", async () => {
    const controller = new AbortController()
    let receivedSignal: AbortSignal | undefined
    const resultPromise = activateExternalApp({
      app: healthViewModel(),
      signal: controller.signal,
      openSession: async (_projectId, signal) => new Promise<void>((_resolve, reject) => {
        receivedSignal = signal
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })
      }),
      wait: async () => undefined,
      checkReadiness: async () => true,
    })

    controller.abort()

    await expect(resultPromise).resolves.toBe("cancelled")
    expect(receivedSignal).toBe(controller.signal)
  })

  it("does not render a prior ready frame while a different app is activating", () => {
    const appA = healthViewModel()
    const appB = { ...appA, appId: "next-app", name: "Next app" }

    expect(frameAppForActivation(appB, { appId: appA.appId, result: "ready" })).toBeNull()
  })

  it("distinguishes a terminal startup failure from a readiness timeout", async () => {
    const result = await activateExternalApp({
      app: healthViewModel(),
      signal: new AbortController().signal,
      openSession: async () => { throw new Error("Terminal unavailable") },
      wait: async () => undefined,
      checkReadiness: async () => true,
    })

    expect(result).toBe("startup-failed")
  })

  it("reports a timeout after the bounded readiness attempts", async () => {
    const events: string[] = []
    const result = await activateExternalApp({
      app: healthViewModel(),
      signal: new AbortController().signal,
      openSession: async () => undefined,
      wait: async (milliseconds) => { events.push(`wait:${milliseconds}`) },
      checkReadiness: async () => { events.push("readiness"); return false },
      maxAttempts: 2,
    })

    expect(result).toBe("timeout")
    expect(events).toEqual(["wait:1000", "readiness", "wait:250", "readiness"])
  })

  it("keeps polling through a Windows Next cold start before mounting", async () => {
    let readinessAttempts = 0
    const result = await activateExternalApp({
      app: healthViewModel(),
      signal: new AbortController().signal,
      openSession: async () => undefined,
      wait: async () => undefined,
      checkReadiness: async () => {
        readinessAttempts += 1
        return readinessAttempts >= 5
      },
    })

    expect(result).toBe("ready")
    expect(readinessAttempts).toBe(5)
  })
})
