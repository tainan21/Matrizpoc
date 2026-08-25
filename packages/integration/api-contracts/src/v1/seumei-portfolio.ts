import { z } from "zod"

const nonNegativeInteger = z.number().int().nonnegative()

export const seumeiPortfolioCompanyV1Schema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(["ONBOARDING", "ACTIVE"]),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
  todayRevenueCents: nonNegativeInteger,
  liveOrderCount: nonNegativeInteger,
  lowStockIngredientCount: nonNegativeInteger,
  workspaceUrl: z.string().regex(/^\/(?!\/)/, "workspaceUrl must be an app-relative path"),
})

export const seumeiPortfolioV1Schema = z
  .object({
    generatedAt: z.string().datetime(),
    companies: z.array(seumeiPortfolioCompanyV1Schema),
    totals: z.object({
      companyCount: nonNegativeInteger,
      todayRevenueCents: nonNegativeInteger,
      liveOrderCount: nonNegativeInteger,
      lowStockIngredientCount: nonNegativeInteger,
    }),
  })
  .superRefine((portfolio, context) => {
    const expected = portfolio.companies.reduce(
      (totals, company) => ({
        companyCount: totals.companyCount + 1,
        todayRevenueCents: totals.todayRevenueCents + company.todayRevenueCents,
        liveOrderCount: totals.liveOrderCount + company.liveOrderCount,
        lowStockIngredientCount: totals.lowStockIngredientCount + company.lowStockIngredientCount,
      }),
      { companyCount: 0, todayRevenueCents: 0, liveOrderCount: 0, lowStockIngredientCount: 0 },
    )
    if (Object.keys(expected).some((key) => expected[key as keyof typeof expected] !== portfolio.totals[key as keyof typeof expected])) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["totals"], message: "Portfolio totals do not match companies" })
    }
  })

export type SeumeiPortfolioCompanyV1 = z.infer<typeof seumeiPortfolioCompanyV1Schema>
export type SeumeiPortfolioV1 = z.infer<typeof seumeiPortfolioV1Schema>
