export const manifest = {
  appId: "naevia",
  name: "NAEVIA",
  description: "Navegador Matriz para coworking humano e agentes em cápsulas isoladas.",
  version: "1.0.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [{ label: "Browser", path: "/", order: 0 }],
  capabilities: [
    { id: "naevia.browser.use", name: "Navegar", description: "Opera superfícies Chromium isoladas." },
    { id: "naevia.browser.capsules", name: "Cápsulas", description: "Separa sessões humanas e de agentes." },
  ],
} as const
