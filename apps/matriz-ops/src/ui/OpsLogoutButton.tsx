"use client"

export function OpsLogoutButton() {
  async function logout() { try { await fetch("/api/auth/oidc/session", { method: "DELETE", headers: { "x-matriz-csrf": "1" } }) } finally { window.location.assign("/") } }
  return <button className="ops-logout" type="button" onClick={logout}>Sair</button>
}
