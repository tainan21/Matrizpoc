# Platform auth boundaries

- Responsibility: versioned technical identity, challenge, session and broker contracts.
- Allowed imports: foundation packages and platform storage.
- Forbidden imports: `apps/*`, design packages and strong product-domain packages.
- Accepted: generic OTP, magic-link, Google mock and direct-email identity behavior.
- Rejected: app-specific permissions, entities, copy or visual components.
