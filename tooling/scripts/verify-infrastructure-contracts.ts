import { loadInfrastructureCatalog } from "../project-factory/infrastructure-catalog"

async function main() {
  const catalog = await loadInfrastructureCatalog(process.cwd())
  if (catalog.issues.length) {
    console.error("Infrastructure Contract verification failed:")
    for (const issue of catalog.issues) console.error(`- ${issue}`)
    process.exitCode = 1
  } else {
    const schemas = catalog.contracts.flatMap((contract) => contract.database.schema ?? [])
    console.log(`Infrastructure Contracts valid: ${catalog.contracts.length} apps, ${schemas.length} schemas.`)
  }
}

void main()
