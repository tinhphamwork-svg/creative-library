# Creative Library — Dark Command Center Redesign

**Date:** 2026-06-24  
**Scope:** Full UI/UX redesign of the React + Tailwind web app  
**Aesthetic:** Dark & moody (Linear/Raycast-inspired)

---

## Background & Pain Points

Current UI issues that this redesign addresses:

1. **Scattered information** — full creative context (perf + status + brief) requires multiple clicks
2. **Poor visual hierarchy** — Winning/Killing creatives don't stand out immediately
3. **No dashboard overview** — no big-picture view across brands
4. **Cumbersome sidebar** — Brand → Product → Concept drill-down is slow

User workflow: morning review performance, afternoon manage/update creatives.

---

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#0d0d14` | App background |
| `bg-surface` | `#16161f` | Cards, panels |
| `bg-elevated` | `#1e1e2e` | Hover states, modals |
| `border` | `#252535` | All borders |
| `accent` | `#7c3aed` → `#8b5cf6` | Violet — CTAs, active states |
| `text-primary` | `#e2e8f0` | Headings, important values |
| `text-secondary` | `#94a3b8` | Labels, metadata |
| `success` | `#10b981` | ROAS, Winning status |
| `warning` | `#f59e0b` | Testing, Actions badge |
| `danger` | `#ef4444` | Killed, errors |

---

## Layout — 3-Zone Structure

```
┌──────┬─────────────────────────────────┬──────────┐
│ Rail │         Main Content            │  Detail  │
│  56px│      (context-aware)            │  Panel   │
│      │  • No brand → Dashboard         │  380px   │
│      │  • Brand selected → List        │  (slide) │
└──────┴─────────────────────────────────┴──────────┘
```

### Icon Rail Sidebar

- **Collapsed (default):** 56px wide, icons only
- **Expanded:** 220px, click toggle button ("☰") or icon to toggle
- **Toggle:** clicking "☰" button expands/collapses the rail. Clicking a brand avatar in collapsed mode selects the brand but does NOT auto-expand.
- **State:** persisted in `localStorage`
- **Contents:**
  - Top: App logo / icon
  - Middle: Dashboard icon, brand avatar buttons (first letter of brand name), `+` add brand
  - Bottom: User avatar (first letter of email) + logout
- **Active brand:** violet highlight ring on brand avatar
- **Expanded state:** shows brand name labels + Product/Concept tree under selected brand

### Main Content Area

Context-aware rendering:
- **No brand selected** → Dashboard
- **Brand selected** → Creative list with TopBar

### Detail Panel

- Slide-over from right, 380px wide
- Semi-transparent backdrop (`bg-black/40`) behind panel
- Close: Escape key, click backdrop, or `✕` button
- Replaces the current fixed-position DetailPanel

---

## Dashboard (Home Screen)

Shown when no brand is selected. Aggregates data from client-side cache.

### Layout

```
┌─────────────────────────────────────────────────┐
│  ⚡ 3 pending actions              [View all →] │  ← amber strip (only if actions > 0)
├─────────────────────────────────────────────────┤
│  Creative Library                [+ New Brand]  │
│  subtitle: "Select a brand to get started"      │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐  ...        │
│  │ Curacoro     │  │ BrandB       │             │
│  │ $12,400      │  │ $4,200       │             │
│  │ 3.8x ROAS    │  │ 2.1x ROAS   │             │
│  │ 12 winning   │  │ 5 winning    │             │
│  │ 48 creatives │  │ 22 creatives │             │
│  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────┘
```

### Brand Card

- Background: `bg-surface`, hover → violet border glow (`border-violet-500`)
- Stats: spend, avg ROAS (emerald), winning count, total creatives
- Stats computed client-side from `useCreatives` cache — no new API calls needed
- Data loads lazily: brand card shows "—" until that brand's creatives are cached
- Click → select brand, navigate to creative list

### Empty State

If no brands exist: illustration + "Add your first brand" CTA.

---

## Creative List

### TopBar

- **Left:** Breadcrumb — `Brand / Product / Concept` (each level clickable to navigate up)
- **Center:** View toggle pill — `Gallery · Table · Matrix`
- **Right (left to right):** Format filter, Status filter, creative count, Sync Meta button, Actions badge, `+ New` button

Styling: white text on dark, filters as minimal dropdowns (no heavy borders).

### Gallery View

**Card design:**
```
┌─────────────────────────┐
│ ▌ [Thumbnail / Format]  │  ← 4px left border strip = status color
│   aspect ratio 16:9     │
│─────────────────────────│
│ Hook text (bold, sm)    │
│ Concept · Angle  [fmt]  │
│─────────────────────────│
│ ROAS: 4.2x   CTR: 2.1%  │
│ $1,240 spend            │
└─────────────────────────┘
```

- **Left border strip (4px):**
  - Winning → `#10b981` emerald
  - Scaling → `#8b5cf6` violet
  - Testing → `#f59e0b` amber
  - Fatigued → `#f97316` orange
  - Killed → `#ef4444` red
  - No status → `#252535` dim
- **Thumbnail:** 45% card height, `object-cover`, rounded-t. Falls back to format label on colored bg.
- **ROAS:** Large, emerald if > 0. Hidden (not placeholder text) if no data.
- **Hover:** `translateY(-2px)` + shadow lift, "Quick view" overlay appears
- **Selected:** violet ring border
- **Grid:** 3 columns default, 4 columns at `xl`

### Table View

- Dark table: header row `bg-elevated`, row hover `bg-surface/50`
- Columns: Hook, Concept, Angle, Format, Status (pill), ROAS (emerald), CTR, Spend
- Status column: colored pill matching status colors above
- Sortable: ROAS, Spend (click header)
- Row click → opens DetailPanel slide-over

### Matrix View

- Keep existing logic (Concept × Angle grid)
- Re-skin to dark theme + new typography
- Cell background intensity based on ROAS value (dim → bright emerald)

### Actions Queue Panel

- Triggered by Actions badge in TopBar
- Renders as a collapsible panel below TopBar (not in sidebar)
- Dark amber background strip
- Same functionality as current

---

## Detail Panel (Slide-over)

```
┌──────────────────────────────────┐
│  [✕]   CRC-C01-A01-F01-V1       │  ← ad name code, monospace
├──────────────────────────────────┤
│  [Thumbnail — full width 16:9]   │
├──────────────────────────────────┤
│  Hook (large bold)               │
│  Concept · Angle · Format tags   │
├──────────────────────────────────┤
│  ROAS    CTR     CPM    Spend    │
│  4.2x    2.1%   $8.4   $1,240   │
│  last synced: Jun 23             │
├──────────────────────────────────┤
│  Status     [Winning      ▾]     │
│  Brief      [In Review    ▾]     │
│  Assignee   [_____________]      │
│  Launch     [_____________]      │
│  Notes      [_____________]      │
├──────────────────────────────────┤
│  [⚡ Add Action]  [✎ Edit Full]  │
│  [🗑 Delete]                     │
└──────────────────────────────────┘
```

- **Inline editing:** Status, Brief Status dropdowns save on change. Text fields save on blur.
- **"Edit Full" button:** Opens existing `CreativeModal` for full form editing
- **Perf metrics row:** always visible, dims if no data (no placeholder text clutter)
- **Backdrop:** `bg-black/40`, click to close

---

## Component Map (files to create/modify)

| File | Action | Notes |
|------|--------|-------|
| `src/index.css` | Modify | Add CSS vars for color tokens |
| `src/App.jsx` | Modify | Add dashboard state, layout restructure |
| `src/components/Sidebar.jsx` | Rewrite | Icon rail with expand/collapse |
| `src/components/Dashboard.jsx` | Create | New home screen component |
| `src/components/BrandCard.jsx` | Create | Card used in Dashboard |
| `src/components/MainArea.jsx` | Modify | TopBar + breadcrumb updates |
| `src/components/CreativeCard.jsx` | Rewrite | New card design with status strip |
| `src/components/DetailPanel.jsx` | Rewrite | Slide-over with inline editing |
| `src/components/MatrixView.jsx` | Modify | Dark re-skin only |

---

## What Does NOT Change

- All API calls (`src/api.js`) — no backend changes
- `useCreatives` hook logic
- `CreativeModal` — kept for full-form editing, triggered from DetailPanel
- `CreativeForm`, `CodeSelect` — internal logic unchanged
- Auth flow (`LoginPage`)
- GAS backend (`src/Code.gs`)

---

## Success Criteria

1. App opens to Dashboard — brand overview visible without any clicks
2. Winning creatives identifiable within 2 seconds of looking at gallery
3. Full creative context (perf + status + brief + actions) visible in DetailPanel without opening modal
4. Sidebar takes ≤56px when collapsed
5. Dark theme consistent across all views (no white flash on any surface)
