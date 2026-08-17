import type { PatternsGenerator } from "../domain/repositories/patterns-generator"
import type { PatternGeneration } from "../domain/types"

export async function generateProjectPatterns(
  generator: PatternsGenerator,
): Promise<PatternGeneration> {
  return generator.generate()
}
export async function inspectProjectPatterns(
  generator: PatternsGenerator,
): Promise<PatternGeneration | null> {
  return generator.inspect()
}
