# Matriz Desktop — Agent Start Here

Matriz Control is a compact Windows utility. Start with
`src/manifest/manifest.ts`, then `src/bootstrap/index.ts`, the typed frontend
gateway, and finally `src-tauri`. Every privileged command is allowlisted and
validated in Rust. The webview never receives generic OS authority.

Primary UI modes are Ports, Apps, Terminal, Actions, Doctor and Settings. The
terminal is the sole intentional arbitrary-input surface and is hosted by a
bounded ConPTY session; automated actions still accept catalog IDs only.
`Ctrl+K` opens the Command Deck. Matriz Admin exposes explicit Web and Native
modes; Seumei is an independent Web app on port 3008.
There are no web routes. Keep new capabilities behind `DesktopGateway`, add
Rust authorization tests first, and never accept raw shell arguments from React.
