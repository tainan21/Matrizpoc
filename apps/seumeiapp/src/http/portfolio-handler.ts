import { readAuthorizedPortfolio } from "../application/read-portfolio"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { PortfolioRepository } from "../domain/repositories/portfolio-repository"
import type { SessionActor } from "../types/session-actor"
import type { HttpResult } from "./company-handlers"

export interface PortfolioHttpServices {
  readonly core: CoreAccessRepository
  readonly portfolio: PortfolioRepository
}

export async function readPortfolioHandler(
  actor: SessionActor,
  services: PortfolioHttpServices,
  now: () => Date = () => new Date(),
  browserAuthority?: Readonly<Record<string, unknown>>,
): Promise<HttpResult> {
  if (browserAuthority && Object.hasOwn(browserAuthority, "tenantId")) {
    return { status: 400, body: { error: "invalid_request" } }
  }
  try {
    return { status: 200, body: await readAuthorizedPortfolio(actor, services.core, services.portfolio, now) }
  } catch {
    return { status: 503, body: { error: "portfolio_unavailable" } }
  }
}
