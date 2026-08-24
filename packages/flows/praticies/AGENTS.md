# Praticies flow boundaries

- Responsibility: reusable catalog, installation, recent-use and layout rules for
  small local utilities.
- Allowed imports: platform storage and foundation primitives.
- Forbidden imports: `apps/*`, React, Next.js, filesystem adapters and product-domain
  packages.
- Accepted: immutable app definitions, versioned browser preference state, ports,
  deterministic use cases and storage adapters.
- Rejected: app routes, app-specific links, executable plugin loading, remote catalog
  fetching or business rules owned by one product.
