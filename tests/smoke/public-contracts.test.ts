/**
 * smoke: public-contract.ts manifest-only (L3)
 *
 * Each app MUST expose exactly a `{ manifest }` object from its
 * public-contract.ts — no other keys, no domain types, no components.
 */
import { describe, it, expect } from "vitest"
import * as hub from "../../apps/matriz-hub/public-contract"
import * as identity from "../../apps/matriz-identity/public-contract"
import * as spot from "../../apps/spot/public-contract"
import * as seumei from "../../apps/seumei/public-contract"
import * as contracts from "../../apps/contracts/public-contract"
import * as willdash from "../../apps/willdash/public-contract"

const APPS = [
  ["matriz-identity", identity],
  ["matriz-hub", hub],
  ["spot", spot],
  ["seumei", seumei],
  ["contracts", contracts],
  ["willdash", willdash],
] as const

describe("public-contract.ts surface (L3)", () => {
  for (const [name, mod] of APPS) {
    it(`${name} exposes only a manifest object`, () => {
      const keys = Object.keys(mod).filter((k) => k !== "default" && k !== "__esModule")
      expect(keys).toEqual(["manifest"])
      const manifest = (mod as { manifest: unknown }).manifest
      expect(manifest).toBeTypeOf("object")
      expect(manifest).not.toBeNull()
    })
  }
})
