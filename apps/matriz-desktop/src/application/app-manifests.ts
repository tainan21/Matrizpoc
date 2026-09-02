import { manifest as contracts } from "../../../contracts/public-contract"
import { manifest as admin } from "../../../matriz-admin/public-contract"
import { manifest as hub } from "../../../matriz-hub/public-contract"
import { manifest as workbench } from "../../../matriz-workbench/public-contract"
import { manifest as matrizlib } from "../../../matrizlib/public-contract"
import { manifest as seumei } from "../../../seumeiapp/public-contract"
import { manifest as sites } from "../../../sites/public-contract"
import { manifest as spot } from "../../../spot/public-contract"
import { manifest as willdash } from "../../../willdash/public-contract"
import { manifest as health } from "../../../health/public-contract"
import { manifest as ops } from "../../../matriz-ops/public-contract"
import { manifest as pay } from "../../../matriz-pay/public-contract"
import { manifest as clientAdmin } from "../../../matriz-client-admin/public-contract"

import type { AppManifestDTO } from "@matriz/integration-api-contracts"

import type { DesktopAppId } from "../domain/types"

export interface DeclaredRoute {
  readonly label: string
  readonly path: string
  readonly openable: boolean
}

const visibleRoutes = (manifest: AppManifestDTO): readonly DeclaredRoute[] =>
  [...manifest.routes]
    .sort((left, right) => left.order - right.order)
    .map((route) => ({
      label: route.label,
      path: route.path,
      openable: !/[\[\]:*]/.test(route.path),
    }))

const manifests = { "matriz-hub": hub, spot, "matriz-admin": admin, contracts, willdash,
  "matriz-workbench": workbench, sites, matrizlib, seumei, health, "matriz-ops": ops,
  "matriz-pay": pay, "matriz-client-admin": clientAdmin } as const

export const APP_MANIFESTS: Readonly<Record<DesktopAppId, {
  readonly name: string
  readonly primaryRoute: string
  readonly routes: readonly DeclaredRoute[]
}>> = Object.freeze(Object.fromEntries(
  Object.entries(manifests).map(([id, manifest]) => [id, {
    name: manifest.name,
    primaryRoute: manifest.primaryRoute,
    routes: visibleRoutes(manifest),
  }]),
) as Record<DesktopAppId, { name: string; primaryRoute: string; routes: readonly DeclaredRoute[] }>)
