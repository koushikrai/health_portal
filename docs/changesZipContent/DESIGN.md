---
name: Clinical Portal Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3e4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#005683'
  on-tertiary: '#ffffff'
  tertiary-container: '#006fa8'
  on-tertiary-container: '#dbecff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: -0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 0.75rem
  gutter-mobile: 0.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored for enterprise occupational health clinicians, medical review officers, and corporate case managers. The emotional objective is unwavering confidence, regulatory composure, and zero-latency operational efficiency. The environment handles legally binding occupational clearances, drug and alcohol screening chains of custody, audiometric baselines, fit-for-duty certifications, and employer dispatch rosters.

The design movement is **Corporate Modern with High-Density Clinical Utility**:
- **Utilitarian precision:** Layouts respect dense data scans over decorative padding. Information hierarchy is strict, legible, and deterministic.
- **Regulatory assurance:** Visual structures communicate authority and HIPAA/OSHA compliance through controlled tones, clear status delineations, and explicit visual validation markers.
- **Reduced cognitive friction:** High cognitive load environments demand subdued background canvases with deliberate, semantically clear color hits for clearance states (Fit, Conditional, Unfit, Pending Lab).

## Colors

The palette uses clinical teal `#0f766e` for primary navigational anchors, dominant CTAs, and certified clearance states, paired with emerald `#059669` as an active operational accent for validated clearances, issued authorizations, and successful clinical checkpoints. 

- **Primary (`#0f766e` - Deep Clinical Teal):** Primary actions, active navigation tabs, certified clearance headers, and secure sign-offs.
- **Secondary (`#059669` - Medical Emerald):** Positive outcomes, fit-for-duty clearance tags, verified laboratory imports, and confirmed appointment slots.
- **Tertiary (`#0284c7` - Diagnostic Cerulean):** In-transit states, dispatch alerts, specimen routing, and audit tracking tags.
- **Neutral (`#64748b` - Slate Gray):** Structural lines, borders, data table grid dividers, and secondary body metadata.
- **Canvas & Surface Palette:**
  - Base canvas: `#f8fafc` (Slate 50) for reduced eye strain during extended clinical shifts.
  - Surface cards: `#ffffff` (Pure White) with crisp `#e2e8f0` (Slate 200) structural framing.
  - Recessed backgrounds: `#f1f5f9` (Slate 100) for fixed table headers, read-only diagnostic fields, and audit trails.
- **Clinical Semantic Indicators:**
  - **Cleared / Fit:** Emerald `#059669` fill / `#ecfdf5` surface.
  - **Conditional / Limited Duty:** Amber `#d97706` fill / `#fffbeb` surface.
  - **Unfit / Disqualified:** Crimson `#dc2626` fill / `#fef2f2` surface.
  - **Specimen Pending:** Sky `#0284c7` fill / `#f0f9ff` surface.

## Typography

The typography pairings prioritize split-second numerical accuracy, patient reference identification, and tabular scanability.

- **Primary Typeface (Headlines & Body):** `Hanken Grotesk` delivers crisp horizontal terminal definition, neutral geometric curves, and high legibility across dense dashboard grids. It provides corporate authority without distracting stylistic flourishes.
- **Monospace Secondary Typeface (Clinical Labels & Data Badges):** `JetBrains Mono` is deployed systematically for all patient IDs, case tracking numbers, chain of custody IDs, laboratory timestamps, clearance validity date ranges, and biometric values (e.g., blood pressure, spirometry values, audiogram frequencies). Monospacing prevents visual shift during real-time filtering and multi-row scanning.
- **Formatting Guidelines:**
  - Clearance validity dates must be rendered in `label-md` uppercase (`YYYY-MM-DD`).
  - Table headers use `label-sm` with explicit uppercase letter tracking (`0.04em`) to establish visual separation from clinical patient names.

## Layout & Spacing

This design system uses a dense 12-column fluid grid on desktop screen sizes (1280px and above) that transitions into responsive operational blocks on tablet and mobile viewports.

- **Desktop (>= 1280px):** 12 columns with `1rem` (16px) gutters and `1.5rem` (24px) outer canvas margins. Left clinical navigation rail is fixed at 256px, leaving the remaining viewport fluid for high-throughput tables and multi-pane clinical inspection drawers.
- **Tablet (768px - 1279px):** 8 columns with `0.75rem` (12px) gutters and `1rem` margins. The navigation collapses to an iconified sidebar (64px) to preserve screen real estate for clinical charting and appointment rosters.
- **Mobile (< 768px):** 4 columns with `0.5rem` (8px) gutters and `0.75rem` (12px) margins. Tabular datasets automatically transition to collapsed clearance card lists; primary filter bars transform into bottom-sheet clinical facets.
- **Density Principles:**
  - Component padding operates on a calibrated compact scale (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 12px) to guarantee that clinicians can review at least 15 active worker cases per viewport without vertical scrolling.
  - Row heights in core data tables are locked to 40px (compact) or 48px (standard with nested clearance sub-badges).

## Elevation & Depth

Visual hierarchy uses **tonal layer structuring and low-contrast clinical outlines** rather than deep decorative drop shadows. Shadows in high-compliance clinical platforms introduce visual noise and reduce focus on fine print.

- **Level 0 (Base Canvas):** Background tone `#f8fafc`. Zero elevation.
- **Level 1 (Card & Module Layer):** Pure white `#ffffff` surfaces bounded by a 1px solid border in `#e2e8f0`. A razor-thin ambient shadow (`0 1px 2px 0 rgba(15, 23, 42, 0.04)`) separates interactive panels from the canvas.
- **Level 2 (Dropdowns, Calendar Slot Pickers, Popovers):** Pure white background bounded by `#cbd5e1` with a disciplined shadow (`0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`).
- **Level 3 (Clinical Drawers, Dispatch Slide-outs & Medical Modals):** Pure white surface bounded by `#94a3b8` on split borders, overlaid on an accessible `#0f172a` backdrop at 45% opacity with a 2px backdrop blur. Elevation shadow: `0 10px 15px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -4px rgba(15, 23, 42, 0.06)`.

## Shapes

The roundedness level is **1 (Soft)**:
- Standard interactive elements (buttons, inputs, select dropdowns, and data table action triggers) carry a crisp `0.25rem` (4px) border radius.
- Cards, clinical panels, and patient summary headers use `0.5rem` (8px) border radius (`rounded-lg`).
- Modal windows, persistent drawer containers, and dispatch dialogs use `0.75rem` (12px) border radius (`rounded-xl`).
- Status indicator tags and clearance validation indicators are strictly governed:
  - Clinical status chips and validity badges use `0.25rem` (4px) to retain an authoritative, document-stamped quality.
  - Rounded pills are restricted exclusively to numeric count badges (e.g., active queue count `(14)`).

## Components

### Buttons
- **Primary Clinical Action:** Background `#0f766e`, text `#ffffff`, border none. Hover state `#115e59`. Active state `#134e4a`. Height 36px in tables, 40px in form footers. Padding: 0 `space-md`. Font: `Hanken Grotesk` 600 weight.
- **Secondary / Action Secondary:** Background `#ffffff`, text `#0f766e`, border 1px solid `#0f766e`. Hover state `#f0fdfa`.
- **Tertiary / Destructive:** Background transparent, text `#dc2626`, hover state `#fef2f2`. Used strictly for revoking clearance, rejecting specimens, or voiding authorizations.

### Clinical Status & Card Validity Badges
- **Cleared / Fit for Duty:** Background `#ecfdf5`, text `#065f46`, border 1px solid `#a7f3d0`. Monospace font (`JetBrains Mono`, `label-md`). Prepended with a 6px solid emerald dot.
- **Limited / Restricted Duty:** Background `#fffbeb`, text `#92400e`, border 1px solid `#fde68a`.
- **Disqualified / Not Cleared:** Background `#fef2f2`, text `#991b1b`, border 1px solid `#fecaca`.
- **Validity Range Stamp:** Border 1px dashed `#0f766e`, background `#f0fdfa`, text `#0f766e`. Explicitly displays expiration format: `EXP: 2026-03-31` in `label-sm`.

### High-Density Data Tables
- **Header:** Background `#f1f5f9`, border-bottom 2px solid `#cbd5e1`. Text in `label-sm`, color `#475569`, text-transform uppercase. Height 36px.
- **Row:** Height 44px. Background alternate hover `#f8fafc`. Border-bottom 1px solid `#e2e8f0`. Monospace font applied to columns containing Employee ID, Order #, National Registry ID, and Expiration.
- **Inline Row Actions:** Pinned right column, compact icon-button row (`space-xs` gap) for direct Medical Review Officer (MRO) sign-off, PDF clearance letter generation, and dispatch routing.

### Input Fields & Selects
- Height 36px. Background `#ffffff`. Border 1px solid `#cbd5e1`. Placeholder color `#94a3b8`. Focus state: border 1px solid `#0f766e`, box-shadow `0 0 0 2px rgba(15, 118, 110, 0.15)`.
- Clinical validation error: Border `#dc2626`, micro-copy in `body-sm` `#dc2626`.

### Checkboxes & Radio Buttons
- 16px by 16px square/circle. Border 1.5px solid `#94a3b8`. Checked state: Background `#0f766e` with `#ffffff` check icon. Used extensively for batch clearance authorizations and multi-worker dispatch releases.

### Appointment Calendar Slots (Clinical Schedule Grid)
- **Available Slot:** White surface, border 1px solid `#e2e8f0`, left border 3px solid `#059669`. Hover: `#f0fdf4`.
- **Occupied / Clinical Assessment:** Background `#f8fafc`, border 1px solid `#cbd5e1`, left border 3px solid `#0f766e`. Displays candidate name (`Hanken Grotesk` 600) and screening type (e.g., "DOT Physical + 10-Panel Rapid") in `body-sm`.
- **Overdue / Flagged:** Left border 3px solid `#dc2626`, background `#fef2f2`.

### Corporate Dispatch Management Cards
- Modular surface (`rounded-lg`, border 1px solid `#e2e8f0`, background `#ffffff`).
- Header split: Company account name + corporate tier on left, batch dispatch tracking ID in `JetBrains Mono` on right.
- Body: Progress tracking bar depicting batch completion percentage (`#059669` fill on `#e2e8f0` track), roster headcount, and quick-dispatch triggers to notify occupational safety liaisons.