import { z } from "zod"

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)
const locale = z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/)

const robotsSchema = z.object({
  index: z.boolean(),
  follow: z.boolean(),
})

const siteMetadataSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  titleTemplate: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().min(1).max(320).optional(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  canonicalPath: z.string().startsWith("/").max(300).optional(),
  openGraphImage: z.string().startsWith("/").max(300).optional(),
  twitterCard: z.enum(["summary", "summary_large_image"]).optional(),
  icons: z.array(z.string().startsWith("/").max(300)).max(10).optional(),
  robots: robotsSchema.optional(),
})

export const sitePresetSchema = z.object({
  schemaVersion: z.literal(1),
  id: slug,
  metadata: siteMetadataSchema,
})

export const siteDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: slug,
    name: z.string().trim().min(1).max(120),
    status: z.enum(["draft", "active", "archived"]),
    presetId: slug,
    defaultLocale: locale,
    locales: z.array(locale).min(1).max(10),
    domains: z.array(z.string().trim().min(1).max(253)).max(20),
    metadata: siteMetadataSchema.extend({
      title: z.string().trim().min(1).max(120),
    }),
  })
  .superRefine((site, context) => {
    if (!site.locales.includes(site.defaultLocale)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Default locale must belong to the locale catalog.",
        path: ["defaultLocale"],
      })
    }
    if (new Set(site.locales).size !== site.locales.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Locales must be unique.",
        path: ["locales"],
      })
    }
  })

export const siteMessagesSchema = z.object({
  hero: z.object({
    eyebrow: z.string().trim().max(120).optional(),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(500),
    cta: z.string().trim().min(1).max(80),
  }),
})

export type SitePreset = z.infer<typeof sitePresetSchema>
export type SiteDefinition = z.infer<typeof siteDefinitionSchema>
export type SiteMessages = z.infer<typeof siteMessagesSchema>

export interface ResolvedSiteDefinition
  extends Omit<SiteDefinition, "metadata"> {
  metadata: SitePreset["metadata"] & SiteDefinition["metadata"]
}

export function resolveSiteDefinition(
  preset: SitePreset,
  site: SiteDefinition,
): ResolvedSiteDefinition {
  if (preset.id !== site.presetId) {
    throw new Error(`Preset ${site.presetId} does not match ${preset.id}.`)
  }
  return {
    ...site,
    metadata: {
      ...preset.metadata,
      ...site.metadata,
      robots:
        preset.metadata.robots || site.metadata.robots
          ? {
              index:
                site.metadata.robots?.index ??
                preset.metadata.robots?.index ??
                false,
              follow:
                site.metadata.robots?.follow ??
                preset.metadata.robots?.follow ??
                false,
            }
          : undefined,
    },
  }
}
