export class WorkspaceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "NOT_INITIALIZED"
      | "CONFLICT"
      | "INVALID_PATH"
      | "INVALID_DATA"
      | "LIMIT_EXCEEDED"
      | "RATE_LIMITED",
  ) {
    super(message)
    this.name = "WorkspaceError"
  }
}

export class RevisionConflictError extends WorkspaceError {
  constructor() {
    super("O item mudou desde a última leitura. Recarregue antes de salvar.", "CONFLICT")
  }
}
