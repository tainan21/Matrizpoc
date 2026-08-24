import { getCoreDb } from "@matriz/platform-db/core"
import { getSeumeiDb } from "@matriz/platform-db/seumei"
import { provisionDemoFederation } from "../src/application/provision-demo-federation"
import { createCompanyRepository } from "../src/infrastructure/company.repository"
import { createCoreAccessRepository } from "../src/infrastructure/core-access.repository"

const coreDb = getCoreDb()
const seumeiDb = getSeumeiDb()

try {
  const result = await provisionDemoFederation(
    process.env,
    createCoreAccessRepository(coreDb),
    createCompanyRepository(seumeiDb),
  )
  process.stdout.write(`${JSON.stringify({ companies: result.companies.map(({ id, tenantId, name, slug, status }) => ({ id, tenantId, name, slug, status })) }, null, 2)}\n`)
} finally {
  await Promise.all([coreDb.$disconnect(), seumeiDb.$disconnect()])
}
