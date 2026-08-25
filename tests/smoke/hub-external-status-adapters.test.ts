import { describe, expect, it } from "vitest"
import { readGitHubProjectStatus } from "../../apps/matriz-hub/src/institutional/integration/external/github-project-status-adapter"
import { readVercelProjectStatus } from "../../apps/matriz-hub/src/institutional/integration/external/vercel-project-status-adapter"

const now = new Date("2026-08-04T12:00:00.000Z")

describe("Hub read-only external status adapters", () => {
  it("maps the latest GitHub check without exposing credentials", async () => {
    const snapshot = await readGitHubProjectStatus({
      repository: "matriz/spot",
      token: "secret-token",
      now,
      fetch: async (_url, init) => {
        expect(init?.method).toBe("GET")
        return Response.json({
          workflow_runs: [{ id: 42, status: "completed", conclusion: "success", html_url: "https://github.com/matriz/spot/actions/runs/42", updated_at: "2026-08-04T11:58:00.000Z" }],
        })
      },
    })

    expect(snapshot).toMatchObject({
      provider: "github",
      status: "passing",
      externalId: "42",
      observation: { nature: "observed", confidence: "verified" },
    })
    expect(JSON.stringify(snapshot)).not.toContain("secret-token")
  })

  it("maps the latest Vercel deployment as read-only status", async () => {
    const snapshot = await readVercelProjectStatus({
      projectId: "prj_spot",
      token: "vercel-secret",
      now,
      fetch: async () => Response.json({
        deployments: [{ uid: "dpl_1", state: "READY", url: "spot-git-main.vercel.app", created: 1785841080000 }],
      }),
    })

    expect(snapshot).toMatchObject({
      provider: "vercel",
      status: "passing",
      externalId: "dpl_1",
      url: "https://spot-git-main.vercel.app",
      observation: { nature: "observed", confidence: "verified" },
    })
    expect(JSON.stringify(snapshot)).not.toContain("vercel-secret")
  })

  it("returns not_configured without making a request when credentials are absent", async () => {
    const snapshot = await readGitHubProjectStatus({
      repository: "matriz/spot",
      now,
      fetch: async () => {
        throw new Error("must not run")
      },
    })

    expect(snapshot.status).toBe("not_configured")
    expect(snapshot.observation.nature).toBe("declared")
  })
})
