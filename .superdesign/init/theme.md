# Matriz Ops Theme

## Compact token summary

- Mode: dark-first operational desktop UI.
- Canvas: `#09080d`; surface: `#121018`; raised surface: `#18131f`.
- Text: `#f4f1fb`; muted: `#aaa0b7`; faint: `#8e879d`.
- Brand violet: `#6d4aff`; highlight: `#a98cff`; soft violet: `#251c36`.
- Success: `#3ddc97`; warning: `#f0b85a`; danger: `#ff7b8a`; info: `#82adff`.
- Borders: `#292331`, stronger `#3d3150`.
- Font: Inter with system sans fallback; mono only for IDs and money minor units.
- Type scale: 12, 13, 14, 18, 26, 30px; numerical KPIs may reach 38px.
- Spacing: 4px base; primary rhythm 8/12/16/20/24/32/44px.
- Radius: 8/10/14/18px; pill 9999px.
- Shadows: subtle black elevation plus restrained violet glow for active/focus states.
- Motion: 120–280ms, cubic-bezier(0.2,0,0,1); respect reduced motion.
- Breakpoint: main compact transition at 800px; desktop remains the primary operational canvas.

## Raw source: `apps/matriz-ops/app/globals.css`

```css
@import "@matriz/design-system/css";
@import "@matriz/design-ui/styles.css";
:root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#09080d; color:#f4f1fb; }
*{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at 70% -20%,#2d1c47 0,transparent 38%),#09080d} a{color:inherit;text-decoration:none}
.ops-shell{display:grid;grid-template-columns:248px 1fr;min-height:100vh}.ops-sidebar{position:sticky;top:0;height:100vh;padding:28px 20px;border-right:1px solid #2a2433;background:rgba(12,10,17,.9);display:flex;flex-direction:column}.ops-brand{display:flex;gap:12px;align-items:center;margin-bottom:38px}.ops-brand small{display:block;color:#8e879d;margin-top:3px}.ops-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:linear-gradient(145deg,#b59af8,#6d4aff);font-weight:900;color:#130c22}.ops-sidebar nav{display:grid;gap:6px}.ops-sidebar nav a{padding:11px 13px;border-radius:9px;color:#aaa0b7;font-size:14px}.ops-sidebar nav a:hover{background:#1c1724;color:#fff}.ops-sidebar-foot{margin-top:auto;color:#8e879d;font-size:12px}.status-dot{display:inline-block;width:7px;height:7px;background:#3ddc97;border-radius:50%;margin-right:7px;box-shadow:0 0 10px #3ddc97}.ops-main{padding:34px 44px 70px}.ops-main>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:34px}.ops-main>header small{color:#9a7be8;letter-spacing:.14em;font-weight:700}.ops-main h1{margin:6px 0 0;font-size:26px}.ops-main>header a{border:1px solid #332a40;padding:9px 13px;border-radius:9px;color:#bcb1c9;font-size:13px}.hero{padding:30px;border:1px solid #342849;border-radius:18px;background:linear-gradient(135deg,rgba(109,74,255,.2),rgba(17,14,24,.92));margin-bottom:22px}.hero h2{font-size:30px;margin:0 0 8px}.hero p{color:#aaa0b7;margin:0;max-width:700px}.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.metric,.panel{border:1px solid #292331;background:rgba(18,15,24,.88);border-radius:14px;padding:20px}.metric span{display:block;color:#8e879d;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.metric strong{display:block;font-size:30px;margin-top:9px}.panel{margin-top:18px}.panel h2{margin:0 0 16px;font-size:18px}.data-table{width:100%;border-collapse:collapse}.data-table th,.data-table td{text-align:left;padding:13px 10px;border-bottom:1px solid #292331;font-size:13px}.data-table th{color:#8e879d;font-size:11px;text-transform:uppercase}.pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#251c36;color:#bca8f4;font-size:11px;margin:2px}.access-card{max-width:620px;margin:12vh auto;padding:34px;border:1px solid #3d3150;background:#14101b;border-radius:18px}.access-card p{color:#aaa0b7}@media(max-width:800px){.ops-shell{grid-template-columns:1fr}.ops-sidebar{position:static;height:auto}.ops-sidebar nav{grid-template-columns:repeat(2,1fr)}.ops-sidebar-foot{display:none}.ops-main{padding:24px 18px}}
```

## Raw source: semantic token scales

`packages/design/system/src/tokens.ts` defines a 4px-derived spacing scale, radii from 4px to 16px, system sans/mono families, feedback colors, restrained elevation and 120/180/280ms motion durations.
