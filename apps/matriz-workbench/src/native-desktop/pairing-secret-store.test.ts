import { describe, expect, it } from "vitest"
import { createPairingSecretStore } from "./pairing-secret-store"

describe("native pairing secret store", () => {
  it("persists only DPAPI-protected bytes and restores the secret", async () => {
    let persisted: Buffer | undefined
    const store = createPairingSecretStore({
      encryptionAvailable: () => true,
      encrypt: (value) => Buffer.from(`protected:${value}`),
      decrypt: (value) => value.toString().replace("protected:", ""),
      read: async () => persisted,
      write: async (value) => { persisted = value },
    })
    await expect(store.getOrCreate(() => "pairing-secret-value")).resolves.toBe("pairing-secret-value")
    expect(persisted?.toString()).toBe("protected:pairing-secret-value")
    await expect(store.getOrCreate(() => "different")).resolves.toBe("pairing-secret-value")
  })

  it("fails closed when OS encryption is unavailable", async () => {
    const store = createPairingSecretStore({
      encryptionAvailable: () => false,
      encrypt: () => Buffer.alloc(0), decrypt: () => "", read: async () => undefined, write: async () => {},
    })
    await expect(store.getOrCreate(() => "secret")).rejects.toThrow("DPAPI")
  })
})
