import { listUserDirectory } from "../../src/application/user-directory"
import { requireOpsPagePrincipal } from "../../src/server/ops-session"
import { AppShell } from "../../src/ui/AppShell"
import Link from "next/link"
export const dynamic = "force-dynamic"
export default async function UsersPage() {
  const principal = await requireOpsPagePrincipal(); if (!principal) return <div className="access-card"><h1>Acesso necessário</h1></div>
  const users = await listUserDirectory()
  return <AppShell><section className="hero"><h2>Usuários</h2><p>Diretório unificado de identidades, memberships, grants, sessões e última atividade.</p></section><section className="panel table-wrap"><table className="data-table"><thead><tr><th>Usuário</th><th>Status</th><th>Apps</th><th>Tenants</th><th>Sessões</th><th>Última atividade</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td><Link href={`/users/${user.id}`}><strong>{user.displayName}</strong><br/><span>{user.email}</span></Link></td><td><span className="pill">{user.status}</span>{user.operatorRole&&<span className="pill">{user.operatorRole}</span>}</td><td>{user.appIds.map(app=><span className="pill" key={app}>{app}</span>)}</td><td>{user.tenantCount}</td><td>{user.activeSessions}</td><td>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString("pt-BR") : "—"}</td></tr>)}</tbody></table></section></AppShell>
}
