/**
 * Strategy contract — pluggable sign-in methods.
 *
 * A strategy has two phases:
 *   1. `start(input)` — kicks off the flow (sends OTP, emits magic link, ...)
 *   2. `verify(input)` — exchanges the challenge for an authenticated identity
 *
 * Each app chooses which strategies to wire. Adding a new strategy type
 * (password, SSO, passkey) is a matter of implementing this interface —
 * no change required in `AuthProvider` or the apps that already work.
 */
import type { AuthIdentity, AuthResult } from "../types"

export type StrategyId = "otp" | "magic-link" | (string & {})

export interface SignInStrategy<
  TStartInput = unknown,
  TStartOutput = unknown,
  TVerifyInput = unknown,
> {
  readonly id: StrategyId
  readonly label: string
  readonly description: string
  start(input: TStartInput): Promise<AuthResult<TStartOutput>>
  verify(input: TVerifyInput): Promise<AuthResult<AuthIdentity>>
}

// ---------------------------------------------------------------------------
// OTP (email + 6-digit code)
// ---------------------------------------------------------------------------

export interface OtpStartInput {
  readonly email: string
}

export interface OtpStartOutput {
  readonly email: string
  /** Mock-only hint that helps devs/testers proceed without an inbox. */
  readonly hint: string
  readonly expiresAt: string
}

export interface OtpVerifyInput {
  readonly email: string
  readonly code: string
}

export type OtpStrategy = SignInStrategy<OtpStartInput, OtpStartOutput, OtpVerifyInput>

// ---------------------------------------------------------------------------
// Magic Link (email + one-shot token)
// ---------------------------------------------------------------------------

export interface MagicLinkStartInput {
  readonly email: string
}

export interface MagicLinkStartOutput {
  readonly email: string
  readonly token: string
  readonly expiresAt: string
}

export interface MagicLinkVerifyInput {
  readonly token: string
}

export type MagicLinkStrategy = SignInStrategy<
  MagicLinkStartInput,
  MagicLinkStartOutput,
  MagicLinkVerifyInput
>
