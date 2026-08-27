import Link from "next/link"
import { Badge, Card, CardHeader, CardTitle, Heading, Stack, Text } from "@matriz/design-ui"
import { monorepoConfig } from "@matriz/platform-config"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"
import {
  findMatrizRepositoryRoot,
  readLocalProjectProfile,
} from "../../src/institutional/integration/local-project-profile-adapter"
import { checkHttpEnvironment } from "../../src/institutional/integration/health/http-health-adapter"

export const dynamic = "force-dynamic"

const APP_ID_BY_PROJECT_ID: Record<string, keyof typeof monorepoConfig.baseUrls> = {
  "matriz:hub": "matriz-hub",
  "matriz:workbench": "matriz-workbench",
  "matriz:sites": "sites",
  "matriz:spot": "spot",
  "matriz:seumei": "seumei",
  "matriz:contracts": "contracts",
  "matriz:willdash": "willdash",
}

export default async function EngineeringPage() {
  await ensureInstitutionalBootstrapped()
  const projects = getGlobalInstitutionalRegistry()
    .list()
    .filter((project) => project.sourceType === "internal_monorepo_app")
  const repositoryRoot = await findMatrizRepositoryRoot(process.cwd()).catch(() => undefined)
  const profiles = await Promise.all(
    projects.map(async (project) => {
      const appId = APP_ID_BY_PROJECT_ID[project.projectId]
      if (!repositoryRoot || !appId) {
        return {
          project,
          environment: undefined,
          profile: {
            projectId: project.projectId,
            appId: appId ?? project.projectId,
            availability: "unavailable" as const,
            commands: {},
            documentation: [],
            localUrl: undefined,
          },
        }
      }
      const localUrl = monorepoConfig.baseUrls[appId]
      return {
        project,
        profile: await readLocalProjectProfile({
          repositoryRoot,
          appId,
          projectId: project.projectId,
          localUrl,
        }),
        environment: await checkHttpEnvironment({
          id: `${appId}:local`,
          kind: "local",
          label: "Local",
          url: localUrl,
          timeoutMs: 750,
        }),
      }
    }),
  )

  const operational = profiles.filter((item) => item.profile.availability === "available").length
  const withDocs = profiles.filter((item) => item.profile.documentation.length > 0).length

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Engineering</Heading>
        <Text tone="muted">
          Descoberta operacional local. Comandos e documentos sao lidos do workspace;
          health externo continua desconhecido ate existir uma observacao verificavel.
        </Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><Text size="xs" tone="muted">Apps internos</Text><Heading level={2}>{profiles.length}</Heading></Card>
        <Card><Text size="xs" tone="muted">Perfis locais disponiveis</Text><Heading level={2}>{operational}</Heading></Card>
        <Card><Text size="xs" tone="muted">Com documentacao inicial</Text><Heading level={2}>{withDocs}</Heading></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {profiles.map(({ project, profile, environment }) => (
          <Card key={project.projectId}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{project.displayName}</CardTitle>
                  <Text size="xs" tone="muted">{project.projectId}</Text>
                </div>
                <Badge tone={profile.availability === "available" ? "success" : "warning"}>
                  {profile.availability === "available" ? "Workspace detectado" : "Indisponivel neste runtime"}
                </Badge>
              </div>
            </CardHeader>

            {profile.localUrl ? (
              <Text size="sm"><strong>Local:</strong> <a className="text-brand underline" href={profile.localUrl}>{profile.localUrl}</a></Text>
            ) : null}
            {environment ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={environment.status === "available" ? "success" : environment.status === "degraded" ? "warning" : "neutral"}>
                  {`Local ${environment.status}`}
                </Badge>
                <Text size="xs" tone="muted">
                  {`observado em ${new Date(environment.observation.collectedAt).toLocaleTimeString("pt-BR")}`}
                </Text>
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {Object.entries(profile.commands).map(([name, command]) => (
                <div key={name} className="grid gap-1 sm:grid-cols-[5rem_1fr]">
                  <Text size="xs" tone="muted">{name}</Text>
                  <code className="overflow-x-auto rounded bg-muted px-2 py-1 text-xs">{command}</code>
                </div>
              ))}
              {Object.keys(profile.commands).length === 0 ? (
                <Text size="sm" tone="muted">Comandos desconhecidos neste runtime.</Text>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="text-sm text-brand underline" href={`/projects/${encodeURIComponent(project.projectId)}`}>
                Ver projeto
              </Link>
              <a
                className="text-sm text-brand underline"
                href={`${monorepoConfig.baseUrls["matriz-workbench"]}/projects/${encodeURIComponent(profile.appId)}`}
              >
                Abrir no Workbench
              </a>
              {profile.documentation.map((doc) => (
                <span key={doc.path} className="font-mono text-xs text-muted-fg">{doc.path}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Stack>
  )
}
