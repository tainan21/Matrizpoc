import { getIdentityDb } from "./persistence.js"
import { seedLocalIdentityCredentials } from "./local-development-seed.js"

const database = getIdentityDb()
seedLocalIdentityCredentials(database, process.env)
  .then(() => process.stdout.write("Local Identity credentials are ready.\n"))
  .catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Identity seed failed"}\n`); process.exitCode = 1 })
  .finally(() => database.$disconnect())
