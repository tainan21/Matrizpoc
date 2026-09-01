import { operationalThemes, type OperationalThemeId } from "@matriz/design-system"

export function ThemePicker({ theme, select }: { theme: OperationalThemeId; select(theme: OperationalThemeId): void }) {
  return (
    <section className="control-theme-picker" aria-labelledby="control-theme-title">
      <div>
        <span className="eyebrow">APARÊNCIA / LOCAL</span>
        <h2 id="control-theme-title">TEMA DO COCKPIT</h2>
        <p>Aplicado imediatamente e restaurado antes do primeiro frame.</p>
      </div>
      <div className="control-theme-options">
        {operationalThemes.map((item) => (
          <button key={item.id} aria-label={item.label} aria-pressed={theme === item.id} onClick={() => select(item.id)}>
            <i data-theme-swatch={item.id} aria-hidden="true" />
            <span><b>{item.label}</b><small>{item.description}</small></span>
          </button>
        ))}
      </div>
    </section>
  )
}
