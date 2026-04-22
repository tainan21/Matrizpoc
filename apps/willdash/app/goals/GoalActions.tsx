"use client"

import { useState } from "react"
import { Button, Stack, Text } from "@matriz/design-ui"
import { asTenantId, asAppId } from "@matriz/foundation-types"
import { getGlobalEventBus } from "@matriz/integration-events"
import type { GoalId } from "../../src/domain/models"
import { getWilldashContainer } from "../../src/lib/container"
import { getWilldashTelemetry } from "../../src/bootstrap"

interface Props {
  goalId: string
  goalTitle: string
}

const TENANT = asTenantId("tenant-acme")
const APP = asAppId("willdash")

export function GoalActions({ goalId, goalTitle }: Props) {
  const [message, setMessage] = useState<string | null>(null)

  async function handleOpenGoal() {
    getGlobalEventBus().emit("willdash.goal.opened", {
      sourceApp: APP,
      tenantId: TENANT,
      payload: { goalId, tenantId: TENANT, title: goalTitle },
    })
    getWilldashTelemetry().track({
      tenantId: TENANT,
      type: "willdash.goal.opened",
      properties: { goalId },
    })
    setMessage(`Meta "${goalTitle}" aberta e evento emitido.`)
  }

  async function handleLogSession() {
    const { useCases } = getWilldashContainer()
    const activity = await useCases.logActivity({
      tenantId: TENANT,
      goalId: goalId as GoalId,
      kind: "session",
      note: `Sessao registrada em ${goalTitle}`,
      value: 1,
    })
    getGlobalEventBus().emit("willdash.activity.logged", {
      sourceApp: APP,
      tenantId: TENANT,
      payload: {
        activityId: activity.id,
        tenantId: TENANT,
        goalId: activity.goalId,
        kind: activity.kind,
      },
    })
    getWilldashTelemetry().track({
      tenantId: TENANT,
      type: "willdash.activity.logged",
      properties: { activityId: activity.id, goalId: activity.goalId, kind: activity.kind },
    })
    setMessage(`Sessao registrada: ${activity.id}.`)
  }

  return (
    <Stack direction="row" gap={2} align="center">
      <Button onClick={handleOpenGoal} variant="secondary">
        Abrir meta
      </Button>
      <Button onClick={handleLogSession}>Registrar sessao</Button>
      {message ? (
        <Text size="sm" tone="muted">
          {message}
        </Text>
      ) : null}
    </Stack>
  )
}
