import { runHealthCheckCli } from "./health-check-cli"

runHealthCheckCli("routes").catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
