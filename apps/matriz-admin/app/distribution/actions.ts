"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createDistributionGatewayFromEnvironment } from "../../src/integration/gateways/distribution.gateway"

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim()

export async function createProductAction(form: FormData) {
  const productId = text(form, "productId")
  await createDistributionGatewayFromEnvironment().createProduct({
    productId,
    displayName: text(form, "displayName"),
    edition: text(form, "edition"),
    runtime: text(form, "runtime") as "tauri" | "electron" | "native" | "web",
    platform: "win32",
    arch: "x64",
    windows: {
      uninstallKey: text(form, "uninstallKey"),
      displayName: text(form, "windowsName"),
      publisher: text(form, "publisher"),
      executableName: text(form, "executableName"),
      aliases: text(form, "aliases").split("|").map((value) => value.trim()).filter(Boolean),
    },
  }, `admin:create:${productId}:${randomUUID()}`)
  revalidatePath("/distribution")
}

export async function createReleaseAction(form: FormData) {
  const productId = text(form, "productId")
  await createDistributionGatewayFromEnvironment().createRelease(productId, {
    version: text(form, "version"),
    channel: text(form, "channel") as "stable" | "beta",
    releasedAt: new Date().toISOString(),
    releaseNotes: text(form, "releaseNotes") || null,
    installer: {
      fileName: text(form, "fileName"), downloadUrl: text(form, "downloadUrl"),
      sizeBytes: Number(text(form, "sizeBytes")), sha256: text(form, "sha256"),
    },
    signature: text(form, "signature"),
  }, `admin:release:${productId}:${randomUUID()}`)
  revalidatePath("/distribution")
}

export async function changeProductStateAction(form: FormData) {
  const productId = text(form, "productId")
  await createDistributionGatewayFromEnvironment().updateProduct(productId, { state: text(form, "state") as "active" | "unavailable" | "retired" }, `admin:state:${productId}:${randomUUID()}`)
  revalidatePath("/distribution")
}

export async function publishReleaseAction(form: FormData) {
  const releaseId = text(form, "releaseId")
  await createDistributionGatewayFromEnvironment().publishRelease(releaseId, `admin:publish:${releaseId}:${randomUUID()}`)
  revalidatePath("/distribution")
}

export async function retireReleaseAction(form: FormData) {
  const releaseId = text(form, "releaseId")
  await createDistributionGatewayFromEnvironment().retireRelease(releaseId, `admin:retire:${releaseId}:${randomUUID()}`)
  revalidatePath("/distribution")
}

