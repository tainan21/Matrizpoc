import { assertSigningConfiguration } from "../desktop/release-manifest"

try {
  assertSigningConfiguration(process.env)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
