/**
 * ProjectCard — UI componente visual para ProjectListItemVM.
 *
 * Usa a brand do projeto como acento visual (borda superior colorida com
 * brandPrimaryColor). Respeita a paleta global do Hub — nao sobrepoe cores
 * semanticas do design system. Sem dominio.
 */
import Link from "next/link"
import { Badge, Card, Stack, Text } from "@matriz/design-ui"
import type { ProjectListItemVM } from "../presenters"

export function ProjectCard({ vm }: { vm: ProjectListItemVM }) {
  return (
    <Link
      href={`/projects/${encodeURIComponent(vm.projectId)}`}
      style={{ textDecoration: "none" }}
    >
      <Card
        className="h-full transition-shadow hover:shadow-md"
        style={{ borderTop: `3px solid ${vm.brandPrimaryColor}` }}
      >
        <Stack gap={3}>
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-md text-xs font-semibold"
              style={{
                background: vm.brandPrimaryColor,
                color: "#fff",
              }}
            >
              {vm.logoText}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-surface-fg">
                {vm.displayName}
              </div>
              <div className="truncate font-mono text-xs text-muted-fg">
                {vm.projectId}
              </div>
            </div>
          </div>

          {vm.tagline ? (
            <Text tone="muted" size="sm">
              {vm.tagline}
            </Text>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            <Badge tone="neutral">{vm.sourceTypeLabel}</Badge>
            <Badge tone={vm.trustTone}>{vm.trustLevelLabel}</Badge>
            <Badge tone={vm.healthTone}>{`${vm.healthLabel} · ${vm.readinessScore}`}</Badge>
            {vm.isPublic ? <Badge tone="brand">Publico</Badge> : null}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-fg">
            <span>{vm.ingestModeLabel}</span>
            {vm.tags.length > 0 ? (
              <span className="truncate">
                {vm.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}
              </span>
            ) : null}
          </div>
        </Stack>
      </Card>
    </Link>
  )
}
