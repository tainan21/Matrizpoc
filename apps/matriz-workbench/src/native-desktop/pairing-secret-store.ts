export interface PairingSecretDependencies {
  encryptionAvailable(): boolean
  encrypt(value: string): Buffer
  decrypt(value: Buffer): string
  read(): Promise<Buffer | undefined>
  write(value: Buffer): Promise<void>
}

export function createPairingSecretStore(dependencies: PairingSecretDependencies) {
  return {
    async getOrCreate(generate: () => string): Promise<string> {
      if (!dependencies.encryptionAvailable()) throw new Error("DPAPI não está disponível para proteger o segredo local de pareamento.")
      const existing = await dependencies.read()
      if (existing) return dependencies.decrypt(existing)
      const secret = generate()
      await dependencies.write(dependencies.encrypt(secret))
      return secret
    },
  }
}
