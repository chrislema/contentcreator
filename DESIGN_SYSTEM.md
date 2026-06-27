# ContentCreator Design System Reference

This app uses a lightweight renderer design system built from small `ui-*` primitives in `renderer/ui.js` and `renderer/styles.css`.

## Rules

- Start new screens with the shared primitives before adding view-specific classes.
- Keep view-specific classes for behavior or layout that is unique to that view.
- Use `CC.ui.button`, `CC.ui.badge`, `CC.ui.card`, `CC.ui.cardHeader`, `CC.ui.formPanel`, `CC.ui.formActions`, and `CC.ui.tagRow` instead of hand-writing repeated markup.
- Use `ui-card`, `ui-card-header`, `ui-card-title`, `ui-card-desc`, `ui-card-meta`, `ui-actions`, `ui-toolbar`, `ui-grid`, `ui-card-grid`, `ui-list-item`, and `ui-tags` as the default UI vocabulary.
- For settings-style card lists, use `settings-panel`, `settings-card-grid`, and `settings-card`.
- Cards in side-by-side grids should stretch to equal height unless the screen has a workflow reason not to.
- Avoid inline styles for presentation.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#f0f4fa` | App background |
| `--bg-soft` | `#e2eaf3` | Hover states and soft fills |
| `--panel` | `#ffffff` | Cards and panels |
| `--sidebar-bg` | `#1a2744` | Sidebar |
| `--border` | `#c5d2e0` | Borders and dividers |
| `--accent` | `#f97316` | Primary actions and highlights |
| `--accent-2` | `#ea580c` | Pressed/deeper orange |
| `--danger` | `#dc2626` | Delete and error states |
| `--ok` | `#16a34a` | Success states |
| `--muted` | `#6b7d96` | Secondary text |

## Buttons And Badges

Buttons that complete a clear command are primary. Secondary navigation or edits are ghost. Destructive actions are danger.

Use badge tones consistently: `accent` for selected/default, `ok` for success, `warn` for partial/caution, `danger` for failure, and `dim` for metadata.

## View Pattern

Every view follows the same shape: `html()` returns the full markup string, and `init()` binds events after the markup is injected. State changes should refresh the relevant collection and navigate back through `CC.navigate()`.
