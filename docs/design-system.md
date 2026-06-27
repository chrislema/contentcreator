# ContentCreator Design System

This app uses a lightweight design system rather than a third-party component framework. The goal is consistent, quiet product UI with small reusable primitives.

## Rules

- Start new screens with the `ui-*` primitives in `renderer/ui.js` and `renderer/styles.css`.
- Keep view-specific classes only for behavior or layout that is unique to that view.
- Use `CC.ui.button`, `CC.ui.badge`, `CC.ui.cardHeader`, `CC.ui.formActions`, and `CC.ui.tagRow` instead of hand-writing repeated markup.
- Use `ui-card`, `ui-card-header`, `ui-card-title`, `ui-card-desc`, `ui-card-meta`, `ui-actions`, `ui-toolbar`, `ui-grid`, `ui-card-grid`, `ui-list-item`, and `ui-tags` before adding new component classes.
- Avoid inline styles for presentation. Add a small shared class if the style could appear twice.
- Cards in two-column grids should stretch to equal height unless the screen has a workflow reason not to.
- Buttons that complete a clear command are primary. Secondary navigation or edits are ghost. Destructive actions are danger.
- Use `badge` tones consistently: `accent` for selected/default, `ok` for success, `warn` for partial/caution, `danger` for failure, `dim` for metadata.

## Files

- `renderer/ui.js`: shared renderer markup helpers.
- `renderer/styles.css`: tokens, shared primitives, and view styles.
- `renderer/views/*.js`: view markup and behavior.

## Adding UI

Prefer this shape:

```js
CC.ui.card(`
  ${CC.ui.cardHeader(CC.escapeHtml(title), {
    actions: CC.ui.button('Edit', { variant: 'ghost', data: { edit: id } })
  })}
  <div class="ui-card-meta">${CC.escapeHtml(meta)}</div>
`, { className: 'feature-card' });
```

That keeps the component structure predictable while leaving room for view-specific behavior.

For settings-style two-column card lists, use `settings-panel`, `settings-card-grid`, and `settings-card` instead of naming the shared layout after a specific settings tab.
