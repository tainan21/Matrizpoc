import { getCoreDb } from "@matriz/platform-db/core"

function ownerEmail(): string {
  const value = process.env.MATRIZ_OPS_OWNER_EMAIL?.trim().toLowerCase()
  if (!value || !value.includes("@")) throw new Error("MATRIZ_OPS_OWNER_EMAIL must contain a valid email")
  return value
}

export async function bootstrapOpsOwner(email = ownerEmail()): Promise<{ userId: string; operatorId: string }> {
  const db = getCoreDb()
  const user = await db.user.upsert({
    where: { email },
    update: { status: "ACTIVE" },
    create: { email, displayName: email.split("@")[0] || "Owner", status: "ACTIVE" },
  })
  const operator = await db.platformOperator.upsert({
    where: { userId: user.id },
    update: { role: "OWNER", active: true, revokedAt: null, revocationReason: null },
    create: { userId: user.id, role: "OWNER", active: true },
  })
  return { userId: user.id, operatorId: operator.id }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  bootstrapOpsOwner().then((result) => {
    process.stdout.write(`Matriz Ops OWNER ready: ${result.userId}\n`)
  }).finally(async () => getCoreDb().$disconnect())
}
