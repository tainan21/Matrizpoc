import { fileURLToPath } from "node:url"

const application = process.env.MATRIZ_CONTROL_BINARY ?? fileURLToPath(
  new URL("./src-tauri/target/release/matriz-control.exe", import.meta.url),
)

export const config = {
  runner: "local",
  specs: ["./acceptance/e2e/**/*.e2e.ts"],
  maxInstances: 1,
  services: [["@wdio/tauri-service", {
    appBinaryPath: application,
    driverProvider: "external",
    autoInstallTauriDriver: true,
    autoDownloadEdgeDriver: true,
    captureBackendLogs: false,
    captureFrontendLogs: false,
    startTimeout: 60_000,
  }]],
  capabilities: [{
    browserName: "tauri",
    "tauri:options": { application },
  }],
  logLevel: "error",
  bail: 0,
  waitforTimeout: 10_000,
  connectionRetryTimeout: 90_000,
  connectionRetryCount: 2,
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 900_000,
  },
  before: async () => {
    const [mainWindow] = await browser.getWindowHandles()
    if (!mainWindow) throw new Error("Matriz Control did not expose its main window")
    await browser.switchToWindow(mainWindow)
  },
}
