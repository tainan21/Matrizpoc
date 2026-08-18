# Matriz Desktop — Agent Start Here

Matriz Control is a compact Windows utility. Start with
`src/manifest/manifest.ts`, then `src/bootstrap/index.ts`, the typed frontend
gateway, and finally `src-tauri`. Every privileged command is allowlisted and
validated in Rust. The webview never receives generic OS authority.

Primary UI modes are Ports, Apps, Actions, Doctor and Settings. There are no
web routes. Keep new capabilities behind `DesktopGateway`, add Rust
authorization tests first, and never accept raw shell arguments from React.
