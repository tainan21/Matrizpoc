"use server"

import { generateProjectPatterns } from "../../src/domains/praticies/application/patterns"
import { hasActiveHubServerSession } from "../../src/auth/server-session"
import { filesystemPatternsGenerator } from "../../src/domains/praticies/integration/filesystem/patterns-generator"
import {
  toPatternGenerationVM,
  type PatternGenerationVM,
} from "../../src/domains/praticies/presentation/presenters"

export interface GeneratePatternsActionState {
  readonly status: "idle" | "success" | "error"
  readonly message: string
  readonly generation: PatternGenerationVM | null
}

export async function generatePatternsAction(
  _previousState: GeneratePatternsActionState,
): Promise<GeneratePatternsActionState> {
  if (!(await hasActiveHubServerSession())) {
    return {
      status: "error",
      message: "Sessão do Hub necessária para executar esta praticidade.",
      generation: null,
    }
  }

  try {
    const generation = await generateProjectPatterns(filesystemPatternsGenerator)
    return {
      status: "success",
      message: `${generation.mappedDirectoryCount} pastas mapeadas com sucesso.`,
      generation: toPatternGenerationVM(generation),
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível gerar os patterns neste ambiente.",
      generation: null,
    }
  }
}
