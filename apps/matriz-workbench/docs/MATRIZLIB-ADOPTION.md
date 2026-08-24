# MatrizLib adoption status

## Current consumer boundary

Matriz Workbench is compatible with the public `@matriz/design-system` token
contract. It imports the public CSS entry point and consumes the exported token
metadata in the local theme-system picker.

The Workbench remains token-only: it does not import `@matriz/design-ui` and it
does not replace its local component composition.

## Local compatibility

- The ten local presets, their density values, and the server-rendered cookie
  preference remain the source of appearance state.
- The active Workbench palette maps the public semantic color aliases such as
  `--matriz-color-canvas`, `--matriz-color-action`, and
  `--matriz-color-focus` to the corresponding `--wb-*` values.
- The picker exposes the public contract version and semantic-token count as a
  compact compatibility status; it is not an adoption gallery or a theme
  replacement.

## Non-goals

- Do not add `@matriz/design-ui` to Workbench.
- Do not move Workbench theme state, cookie persistence, presets, or component
  composition into a shared package.
