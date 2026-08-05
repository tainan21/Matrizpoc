import { z } from "zod"
import { projectKindSchema } from "./federated-sources"

const blueprintId = z.string().regex(/^bp_[0-9a-f-]{36}$/)
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)

export const projectBlueprintInputSchema = z
  .object({
    mode: z.enum(["create", "adopt"]),
    name: z.string().trim().min(1).max(120),
    projectKind: projectKindSchema,
    target: z.string().trim().min(1).max(300),
    platforms: z.array(slug).max(10).default([]),
    ownedDomains: z.array(slug).max(30).default([]),
    consumedCapabilities: z.array(slug).max(30).default([]),
    sharedCandidates: z.array(slug).max(30).default([]),
    templateId: z.enum([
      "application-next",
      "library-typescript",
      "site-collection-next",
      "adopt-existing",
    ]),
    validationCommands: z.array(z.string().trim().min(1).max(300)).max(20),
  })
  .superRefine((input, context) => {
    if (
      input.mode === "create" &&
      !/^apps\/[a-z0-9][a-z0-9-]*$/.test(input.target)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New projects must target one direct apps/<id> folder.",
        path: ["target"],
      })
    }
    if (input.mode === "adopt" && input.templateId !== "adopt-existing") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adopt mode must use the adopt-existing template.",
        path: ["templateId"],
      })
    }
  })

export const projectBlueprintSchema = projectBlueprintInputSchema.and(
  z.object({
    schemaVersion: z.literal(1),
    id: blueprintId,
    status: z.enum(["draft", "requested", "applied", "cancelled"]),
    preview: z.object({
      files: z.array(z.string().min(1).max(300)).max(40),
      notes: z.array(z.string().min(1).max(500)).max(20),
    }),
    backlogItemId: z.string().regex(/^tsk_[0-9a-f-]{36}$/).optional(),
    agentRequestId: z.string().regex(/^req_[0-9a-f-]{36}$/).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    revision: z.string().min(8),
  }),
)

export type ProjectBlueprintInput = z.infer<
  typeof projectBlueprintInputSchema
>
export type ProjectBlueprint = z.infer<typeof projectBlueprintSchema>
