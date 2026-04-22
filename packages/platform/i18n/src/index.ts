/**
 * @matriz/platform-i18n
 *
 * Minimal i18n primitives: locale type, dictionary shape, a `t()` helper.
 * Apps can register their own dictionaries locally; this package only
 * provides infrastructure (L4 / L12).
 */
export const PLATFORM_I18N_VERSION = "0.1.0" as const

export type Locale = "pt-BR" | "en-US"
export const DEFAULT_LOCALE: Locale = "pt-BR"

export type Dictionary = Readonly<Record<string, string>>

export interface Translator {
  readonly locale: Locale
  t(key: string, vars?: Readonly<Record<string, string | number>>): string
}

export function createTranslator(
  locale: Locale,
  dictionary: Dictionary,
  fallback?: Dictionary,
): Translator {
  const resolve = (key: string): string | undefined =>
    dictionary[key] ?? fallback?.[key]

  return {
    locale,
    t(key, vars) {
      const raw = resolve(key) ?? key
      if (!vars) return raw
      return raw.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => {
        const v = vars[name]
        return v === undefined ? `{{${name}}}` : String(v)
      })
    },
  }
}
