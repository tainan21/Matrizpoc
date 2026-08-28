import { notFound } from "next/navigation"
import { getUserDirectoryEntry } from "../../../src/application/user-directory"
import { walletForUser } from "../../../src/application/pay-client"
import { requireOpsPagePrincipal } from "../../../src/server/ops-session"
import { AppShell } from "../../../src/ui/AppShell"
import { UserActions } from "../../../src/ui/UserActions"
export const dynamic = "force-dynamic"
export default async function UserPage({ params }: { params: Promise<{ userId: string }> }) {
  const principal = await requireOpsPagePrincipal(); if (!principal) return <div className="access-card"><h1>Acesso necessário</h1></div>
  const user = await getUserDirectoryEntry((await params).userId); if (!user) notFound()
  let wallet = null; try { wallet = await walletForUser(user.id) } catch { wallet = null }
  return <AppShell><section className="hero"><h2>{user.displayName}</h2><p>{user.email} · identidade criada em {new Date(user.createdAt).toLocaleDateString("pt-BR")}</p><span className="pill">{user.status}</span>{user.operatorRole && <span className="pill">{user.operatorRole}</span>}</section><section className="detail-grid"><article className="panel"><h2>Acessos por tenant</h2>{user.memberships.length ? user.memberships.map((membership) => <div className="detail-block" key={membership.id}><strong>{membership.tenant.name}</strong><p>{membership.tenantRoles.join(", ") || "Sem papel de tenant"}</p>{membership.grants.map((grant) => <span className="pill" key={grant.id}>{grant.appId} · {grant.revokedAt ? "revogado" : grant.appRoles.join(", ")}</span>)}</div>) : <p>Nenhum tenant.</p>}</article><article className="panel"><h2>Wallet</h2>{wallet ? wallet.accounts.map((account) => <div className="balance-line" key={account.currency}><span>{account.currency}</span><strong>{account.balance.amountMinor}</strong></div>) : <p>Usuário ainda não possui wallet.</p>}</article></section><section className="panel"><h2>Sessões</h2><table className="data-table"><thead><tr><th>App</th><th>Estratégia</th><th>Último sinal</th><th>Expira</th><th>Status</th></tr></thead><tbody>{user.sessions.map((session) => <tr key={session.id}><td>{session.appId}</td><td>{session.strategyId}</td><td>{new Date(session.lastSeenAt).toLocaleString("pt-BR")}</td><td>{new Date(session.expiresAt).toLocaleString("pt-BR")}</td><td>{session.revokedAt ? "Revogada" : "Ativa"}</td></tr>)}</tbody></table></section><UserActions userId={user.id} status={user.status} walletId={wallet?.walletId}/></AppShell>
}
