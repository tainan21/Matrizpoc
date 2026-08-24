# Matriz Control — Store, Wallet and Controlled Packages

## Outcome

Add an ecosystem Store whose catalog, ownership, wallet ledger and installation state are native-authoritative and connect installed entries to the existing Control app/runtime registry.

## Product boundary

- Store is a distribution surface, not a universal package manager.
- Matriz Credits are an internal auditable ledger, not money or cryptocurrency.
- Ownership and installation are distinct states.
- The first catalog is bundled and allowlisted. No downloaded script or arbitrary entrypoint executes.
- Installation records a verified package manifest in Control application data and registers only an existing Matriz app ID.

## Native model

`CommerceStore` persists one versioned JSON document in the Tauri app data directory with:

- wallet opening grant and immutable ledger transactions;
- owned package IDs;
- installed package versions.

Balance is calculated from the ledger in the native process. Mutations are serialized, validated, atomically persisted, and emit structured activity without financial or secret payloads.

The bundled catalog exposes package metadata, permissions, compatibility, price and the existing runtime app ID. This keeps package authority narrow while proving the complete lifecycle.

## Renderer model

The renderer receives a `CommerceSnapshot` view model. It can request only exact transitions:

- refresh Store;
- acquire a known package;
- install an owned known package;
- uninstall installation metadata.

The Wallet is visually prominent in the Store header. Package cards show price, permissions and state, while the ledger stays compact and auditable.

## Security

- no remote catalog or arbitrary package URL;
- no install hooks or shell commands;
- no renderer-controlled destination path;
- exact allowlisted package/runtime mapping;
- atomic persistence in app data;
- insufficient balance and duplicate ownership rejected natively.

## Deliberately deferred

Remote downloads, signatures, publisher onboarding, real payments, subscriptions, arbitrary extensions and package scripts require a larger trust model and are not part of this slice.
