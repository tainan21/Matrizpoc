/**
 * @matriz/foundation-constants
 *
 * Stable constants and enums usable across all packages and apps.
 * L12: must remain domain-free. No app-specific lists here.
 */
export declare const MATRIZ_APP_IDS: readonly ["matriz-identity", "matriz-hub", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"];
export type MatrizAppId = (typeof MATRIZ_APP_IDS)[number];
/** Human-facing names (used by UI/catalog; remains domain-free). */
export declare const MATRIZ_APP_NAMES: Readonly<Record<MatrizAppId, string>>;
export declare const CONTRACT_VERSION_V1: "v1";
export type ContractVersion = typeof CONTRACT_VERSION_V1;
export declare const CURRENT_CONTRACT_VERSION: "v1";
export declare const MATRIZ_EVENT_NAMES: readonly ["onboarding.completed", "spot.gig.created", "seumei.establishment.selected", "contract.created", "contract.linked", "hub.app.opened", "willdash.goal.opened", "willdash.activity.logged", "docs.document.created", "docs.document.imported", "docs.document.converted", "docs.document.version.created", "docs.document.version.published", "docs.document.deprecated", "docs.block.created", "docs.entity.created", "docs.entity.detected", "docs.relation.suggested", "docs.relation.approved", "docs.relation.rejected", "docs.suggestion.created", "docs.suggestion.accepted", "docs.suggestion.rejected", "docs.context.created", "docs.context.updated", "docs.context.published", "docs.mcp.read", "docs.mcp.refreshed", "docs.taskCandidate.created", "docs.governanceCandidate.created", "docs.export.generated", "docs.timeline.created"];
export type MatrizEventName = (typeof MATRIZ_EVENT_NAMES)[number];
export declare const MATRIZ_MOCK_TENANT_IDS: readonly ["tenant_demo", "tenant_acme"];
export type MatrizMockTenantId = (typeof MATRIZ_MOCK_TENANT_IDS)[number];
export declare const EXTERNAL_LINK_RELATION_TYPES: readonly ["contract.source", "contract.reference", "contract.party", "tenant.ownership", "manifest.declared"];
export type ExternalLinkRelationType = (typeof EXTERNAL_LINK_RELATION_TYPES)[number];
//# sourceMappingURL=index.d.ts.map