import { runHealthCheckCli } from "./health-check-cli"

runHealthCheckCli("apis").catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
