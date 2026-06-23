# ContentCreator - Design System Reference

> This document is the canonical reference for spacing, layout, and UI patterns.
> All new views and components MUST follow these specs. Do not re-litigate.

## Color Palette (locked)

| Token            | Value     | Use                              |
|------------------|-----------|----------------------------------|
| --bg             | #f0f4fa   | App background                   |
| --bg-soft        | #e2eaf3   | Hover states, soft fills         |
| --panel          | #ffffff   | Cards, panels                    |
| --sidebar-bg     | #1a2744   | Sidebar navy                     |
| --border         | #c5d2e0   | Card borders, dividers           |
| --accent         | #f97316   | Primary actions, highlights      |
| --accent-2       | #ea580c   | Pressed/deeper orange            |
| --danger         | #dc2626   | Delete, error                    |
| --ok             | #16a34a   | Success, working status          |
| --muted          | #6b7d96   | Secondary text                   |

**No brown. No beige. Navy/orange/white only.**

## Layout Spacing (locked)

### Main Content Container
- **Padding**: `20px 32px 60px` (top, sides, bottom)
- Cards must NEVER touch the sidebar edge - minimum 32px side padding

### Section Headers
- Use `CC.header(title, subtitle, actionsHtml)` helper
- Action buttons right-aligned in header

### Add Button Pattern
- Right-aligned using `align-self: flex-end` inside a flex column section
- Use `.mcp-section` wrapper which is `display:flex; flex-direction:column`
- Button class: `btn-primary btn-sm`
- Spacing above card list: the card list container needs `margin-top: 40px`
- **IMPORTANT**: The `align-self: flex-end` CSS rule in styles.css must include EVERY section's add button ID. Currently: `#mcp-add`, `#model-add`, `#existing-import`. When adding a new section, add its button ID to this rule.

## Card Patterns (locked)

### Full-Width Stacked Cards (Models, MCPs, Settings)
- Use `.mcp-card` class
- Container: `.mcp-list` with `margin-top: 40px`
- Card padding: `16px 20px`
- Card structure:
  ```
  .mcp-card-top (flex row, space-between)
    .mcp-card-name (font-size 14px, bold)
    .mcp-card-actions (buttons: Test/Edit/Remove)
  .mcp-card-url (font-size 12px, color muted)
  ```

### Grid Cards (Audiences, Topics)
- 2-column grid: `grid-template-columns: repeat(2, 1fr)`
- Gap between cards: `20px`
- Container padding: `20px 32px 60px`
- Responsive: collapse to 1 column under 900px

### Collapsible Cards (Audience segments)
- Use `.ms-card` class
- Header padding: `20px 22px`
- Body padding: `0 22px 24px`
- Internal section spacing: `margin-bottom: 20px` per `.ms-section`
- Last section in a card: `margin-bottom: 0`
- Line height for body text: `1.6`
- Pyramid level spacing: `margin-bottom: 8px`
- Pain row spacing: `margin-bottom: 10px`

## Card Vertical Spacing Rules (locked)

Inside every card type:
- Section headers (h5): `margin-bottom: 8px`
- Paragraphs/lists: `line-height: 1.6`, `margin: 0`
- Between sections: `20px` minimum
- Between list items: natural line-height spacing, no extra margin needed

## Chat Playground Pattern (locked)

Used in Models test and MCPs test. Structure:
- `.mcp-chat` container
- `.mcp-chat-messages` scrollable area
- Messages left-aligned, user messages shaded bubbles, assistant plain text
- `.mcp-chat-input-wrap` with auto-growing textarea + send arrow button
- `.mcp-chat-meta` bar with clickable selectors and status badges
- Auto-scroll to bottom on new message
- Enter to send, Shift+Enter for newline

## Button Styles (locked)

| Class            | Use                        |
|------------------|----------------------------|
| btn-primary      | Main actions (save, add)   |
| btn-primary btn-sm | Card actions (test, save)|
| btn-ghost        | Secondary (edit, cancel)   |
| btn-ghost btn-sm | Card secondary actions     |
| btn-danger       | Destructive (delete)       |
| btn-danger btn-sm| Card delete                |

## Badge Styles (locked)

| Class       | Use                              |
|-------------|----------------------------------|
| badge ok    | Working / success (green border) |
| badge dim   | Untested / inactive              |
| badge accent| Dominant force, tags             |
| badge (plain)| Info tags, force labels         |

## Form Pattern (locked)

- Use `.mcp-form` class for collapsible add/edit forms
- White panel background, border, rounded
- `.form-row` for side-by-side fields
- `.form-group` with label above input
- Save + Cancel buttons at bottom

## View Rendering Pattern (locked)

Every view follows this structure:
```javascript
CC.views.xxx = {
  html() {
    // Returns full HTML string
    // Uses CC.header() for title bar
    // Uses CC.empty() for empty states
  },
  init() {
    // Query selectors and event listeners
    // Called after html() is injected
  }
}
```

## Navigation Pattern (locked)

- `CC.navigate('viewName')` re-renders and calls init()
- State changes require `await CC.refresh('collection')` then `CC.navigate()`
- View-specific state (selectedId, chat history) persists on the view object

## Anti-Patterns (do NOT do these)

1. Do NOT use inline styles for spacing - use CSS classes
2. Do NOT use margin-bottom on buttons for vertical spacing - use padding-top or margin-top on the element below
3. Do NOT use `.list-item` for card layouts - use dedicated card classes
4. Do NOT mix card types - grid cards vs stacked cards serve different purposes
5. Do NOT let card borders touch container edges - always pad the container
6. Do NOT nest microSegments inside audience documents - each segment is standalone
