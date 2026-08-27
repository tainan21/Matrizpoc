import { describe, expect, it } from "vitest"
import { DesktopConfigurationError, resolveDesktopRuntimeConfig } from "./runtime-config"

describe("resolveDesktopRuntimeConfig", () => {
  it("uses fixed loopback origins in development", () => {
    const configuration = resolveDesktopRuntimeConfig({
      isPackaged: false,
      builtAppUrl: "",
      builtHubUrl: "",
    })

    expect(configuration).toEqual({
      mode: "development",
      seumeiOrigin: "http://127.0.0.1:3008",
      hubOrigin: "http://127.0.0.1:3000",
      allowedOrigins: ["http://127.0.0.1:3008", "http://127.0.0.1:3000"],
    })
  })

  it("uses only HTTPS origins embedded by the trusted build in production", () => {
    const configuration = resolveDesktopRuntimeConfig({
      isPackaged: true,
      builtAppUrl: "https://seumei.matriz.example/path-is-not-an-origin",
      builtHubUrl: "https://myhub.matriz.example/login",
    })

    expect(configuration.allowedOrigins).toEqual([
      "https://seumei.matriz.example",
      "https://myhub.matriz.example",
    ])
  })

  it("fails closed when a production build origin is absent or not HTTPS", () => {
    expect(() => resolveDesktopRuntimeConfig({
      isPackaged: true,
      builtAppUrl: "http://seumei.matriz.example",
      builtHubUrl: "https://myhub.matriz.example",
    })).toThrow("SEUMEI_DESKTOP_APP_URL must be an HTTPS URL")

    expect(() => resolveDesktopRuntimeConfig({
      isPackaged: true,
      builtAppUrl: "https://seumei.matriz.example",
      builtHubUrl: "",
    })).toThrow("SEUMEI_DESKTOP_HUB_URL is required in the trusted build")
  })
})
