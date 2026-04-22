/**
 * ProjectBrandIdentity (v1, institutional).
 *
 * Identidade visual institucional de um projeto. Consumida pelo Hub control
 * plane e pela superficie publica. Domain-free.
 */
import { z } from "zod"

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "expected hex color like #fff or #112233")

export const BRAND_TONE_VALUES = [
  "institutional",
  "product",
  "experimental",
  "legacy",
] as const

export const brandToneSchema = z.enum(BRAND_TONE_VALUES)
export type BrandTone = z.infer<typeof brandToneSchema>

export const projectBrandIdentitySchema = z.object({
  brandName: z.string().min(1),
  tagline: z.string().min(1).optional(),
  primaryColor: hexColor,
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  logoText: z.string().min(1).optional(),
  tone: brandToneSchema,
})
export type ProjectBrandIdentity = z.infer<typeof projectBrandIdentitySchema>
