# Score 0–100

The score is binary and evidence-based.

- Every scorecard defines exactly 100 goals.
- A goal contributes `0` while its outcome is absent or unverified.
- A goal contributes `1` only after an observable result exists.
- The score is the sum of completed goals, never a subjective percentage.
- Returning a goal to `0` is valid when evidence no longer represents reality.

The default catalog is deliberately broad: vision, product, architecture,
design, experience, quality, security, performance, collaboration and scale.
After initialization, the canonical state lives in `.matriz/roadmap.json`.

## Multiple scorecards

A project may have independent scorecards for different responsibilities.
Matriz Workbench starts with `app`, `docs` and `features-domains`. Matriz Infra
Hub starts with an ecosystem `docs` scorecard. Each scorecard is independently
0–100; scores are never summed into a fabricated global percentage.

The legacy `goals` collection remains readable as the historical general
baseline. New specialized work belongs to `scorecards`.

## Package governance

A roadmap goal does not justify a shared package by itself. Extraction to
`packages/*` requires:

1. at least two real app consumers;
2. no strong product-domain semantics;
3. a stable public surface;
4. a measurable reduction in maintenance cost.

Until these conditions exist, implementation, tokens and components remain
inside the app.

## Collaboration loop

1. Select the next goals still scored `0`.
2. Open **Colaborar** and copy the generated prompt.
3. Continue in the same Codex task while objective and working tree are shared.
4. Implement and validate one bounded slice.
5. Register checks and affected files.
6. Move goals to `1` only after reviewing the evidence.
