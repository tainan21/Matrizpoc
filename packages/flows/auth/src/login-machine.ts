import type { AuthChallenge, AuthMethodId, AuthStatus } from "@matriz/platform-auth"

export interface LoginFlowState {
  readonly method: AuthMethodId
  readonly email: string
  readonly code: string
  readonly phase: "idle" | "loading" | "challenge" | "error" | "signed-in"
  readonly challenge?: AuthChallenge
  readonly message?: string
}

export type LoginFlowAction =
  | { readonly type: "method.selected"; readonly method: AuthMethodId }
  | { readonly type: "email.changed"; readonly email: string }
  | { readonly type: "code.changed"; readonly code: string }
  | { readonly type: "loading" }
  | { readonly type: "challenge.started"; readonly challenge: AuthChallenge }
  | { readonly type: "challenge.reset" }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "signed-in" }

export function createLoginState(method: AuthMethodId): LoginFlowState {
  return { method, email: "", code: "", phase: "idle" }
}

export function shouldVerifyMagicLink(status: AuthStatus, token: string | null, hasSession: boolean): boolean {
  return Boolean(token) && !hasSession && status !== "booting" && status !== "signed-in" && status !== "refreshing"
}

export function loginFlowReducer(state: LoginFlowState, action: LoginFlowAction): LoginFlowState {
  switch (action.type) {
    case "method.selected": return { ...state, method: action.method, phase: "idle", code: "", challenge: undefined, message: undefined }
    case "email.changed": return { ...state, email: action.email }
    case "code.changed": return { ...state, code: action.code.replace(/\D/g, "").slice(0, 6) }
    case "loading": return { ...state, phase: "loading", message: undefined }
    case "challenge.started": return { ...state, phase: "challenge", challenge: action.challenge, code: "", message: undefined }
    case "challenge.reset": return { ...state, phase: "idle", challenge: undefined, code: "", message: undefined }
    case "failed": return { ...state, phase: "error", message: action.message }
    case "signed-in": return { ...state, phase: "signed-in", message: undefined }
  }
}
