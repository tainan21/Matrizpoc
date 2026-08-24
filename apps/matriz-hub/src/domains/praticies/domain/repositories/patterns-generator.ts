import type { PatternGeneration } from "../types"

export interface PatternsGenerator {
  generate(): Promise<PatternGeneration>
  inspect(): Promise<PatternGeneration | null>
  readArtifact(format: "human" | "llm"): Promise<string | null>
}
