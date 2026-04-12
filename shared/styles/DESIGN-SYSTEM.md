# EzBOQ Design System — "Zen Contractor"

> Japanese minimal warmth meets Thai contractor practicality.
> Version 2.0.0

---

## 1. Color Palette

### Core Philosophy
Warm wood tones, soft kinari whites, muted matcha greens, subtle gold accents.
NOT corporate tech blue. Think: a well-lit Japanese carpentry workshop.

### Semantic Tokens (Light / Dark)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `#fefdfb` | `#1a1816` | Page background |
| `--foreground` | `#2a2320` | `#e8e0d4` | Primary text |
| `--primary` | `#574a3d` | `#d4c8b5` | Buttons, key actions |
| `--primary-foreground` | `#fefdfb` | `#2a2320` | Text on primary |
| `--secondary` | `#f3efe8` | `#2d2824` | Secondary surfaces |
| `--accent` | `#f3f8f4` | `#1e2a20` | Subtle green highlight |
| `--muted` | `#f3efe8` | `#2d2824` | Disabled, bg fill |
| `--muted-foreground` | `#8a8683` | `#8a8683` | Placeholder text |
| `--destructive` | `#c53030` | `#e53e3e` | Delete, errors |
| `--success` | `#3b7349` | `#6daa7a` | Complete, approved |
| `--warning` | `#a68753` | `#d9c098` | Pending, caution |
| `--info` | `#4d8f5e` | `#9cc7a5` | Informational |
| `--border` | `rgba(169,146,121,0.18)` | `rgba(169,146,121,0.14)` | All borders |
| `--gold` | `#c4a573` | `#d9c098` | Premium accent |

### Brand Color Scales

**Wood** (primary warmth): `wood-50` to `wood-950`
- 50: `#faf8f5` → 500: `#a89279` → 950: `#2a2320`

**Matcha** (success/nature): `matcha-50` to `matcha-950`
- 50: `#f3f8f4` → 500: `#4d8f5e` → 950: `#122117`

**Kinari** (warm white/gold): `kinari-50` to `kinari-950`
- 50: `#fefdfb` → 500: `#d9c098` → 950: `#3d301d`

**Sumi** (neutral ink): `sumi-50` to `sumi-950`
- 50: `#f7f7f6` → 500: `#8a8683` → 950: `#1c1b1a`

---

## 2. Typography

### Font Families
```css
--font-sans: 'Sarabun', 'Noto Sans Thai', -apple-system, sans-serif;
--font-heading: 'IBM Plex Sans Thai', 'Sarabun', sans-serif;
--font-mono: 'IBM Plex Mono', 'Courier New', monospace;
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| h1 | 3rem (48px) | 500 | 1.3 | Page hero |
| h2 | 2.25rem (36px) | 500 | 1.3 | Section title |
| h3 | 1.875rem (30px) | 500 | 1.3 | Subsection |
| h4 | 1.5rem (24px) | 500 | 1.3 | Card title |
| h5 | 1.25rem (20px) | 500 | 1.3 | Group label |
| h6 | 1.0625rem (17px) | 500 | 1.45 | Subheading |
| body | 0.875rem (14px) | 300 | 1.65 | Default text |
| body-md | 0.9375rem (15px) | 400 | 1.65 | Emphasized |
| small | 0.8125rem (13px) | 400 | 1.5 | Secondary |
| caption | 0.75rem (12px) | 400 | 1.5 | Table headers |
| overline | 0.625rem (10px) | 600 | 1.4 | Labels, kickers |

### Font Weights
- 300: Light (body text default)
- 400: Regular (secondary text, inputs)
- 500: Medium (headings, buttons, labels)
- 600: SemiBold (kickers, overlines, table headers)
- 700: Bold (rare, emphasis only)

---

## 3. Spacing Scale

4px base grid:

| Token | Value | px |
|---|---|---|
| `0.5` | 0.125rem | 2 |
| `1` | 0.25rem | 4 |
| `1.5` | 0.375rem | 6 |
| `2` | 0.5rem | 8 |
| `3` | 0.75rem | 12 |
| `4` | 1rem | 16 |
| `5` | 1.25rem | 20 |
| `6` | 1.5rem | 24 |
| `8` | 2rem | 32 |
| `10` | 2.5rem | 40 |
| `12` | 3rem | 48 |
| `16` | 4rem | 64 |
| `20` | 5rem | 80 |
| `24` | 6rem | 96 |

**Contextual spacing:**
- Page padding: `clamp(1rem, 3vw, 2rem)`
- Section gap: `clamp(1.5rem, 3vw, 2.5rem)`

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-xs` | 4px | Badges, chips |
| `radius-sm` | 6px | Buttons, inputs, sidebar items |
| `radius-md` | 8px | Cards (default) |
| `radius-lg` | 12px | Dialogs, panels |
| `radius-xl` | 16px | Hero sections |
| `radius-2xl` | 20px | Feature cards |
| `radius-3xl` | 24px | Large sections |
| `radius-full` | 9999px | Pills, avatars |

---

## 5. Shadow System

All shadows use warm brown tint `rgba(42, 35, 32, ...)`:

| Token | Value | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px 0.04` | Subtle lift (buttons) |
| `shadow-sm` | `0 2px 6px 0.05` | Cards at rest |
| `shadow-md` | `0 8px 24px 0.06` | Elevated cards |
| `shadow-lg` | `0 16px 48px 0.07` | Dialogs, dropdowns |
| `shadow-xl` | `0 24px 80px 0.09` | Hero, modals |

Dark mode uses `rgba(0, 0, 0, ...)` with higher opacity.

---

## 6. Component Themes

### Buttons (Tailwind classes + CSS classes)

| Variant | Class | Style |
|---|---|---|
| Primary | `ez-btn-primary` | Warm wood bg, light text |
| Secondary | `ez-btn-secondary` | Kinari bg, wood text |
| Ghost | `ez-btn-ghost` | Transparent, hover fills |
| Destructive | `ez-btn-destructive` | Red bg, white text |
| Gold | `ez-btn-gold` | Gold gradient, premium |

Sizes: `ez-btn-sm`, default, `ez-btn-lg`, `ez-btn-icon`

### Cards

| Variant | Class | Style |
|---|---|---|
| Default | `ez-card` | Glass bg, subtle shadow |
| Elevated | `ez-card-elevated` | Stronger shadow, blur |
| Outlined | `ez-card-outlined` | Border only, transparent |
| Filled | `ez-card-filled` | Solid soft bg, no border |

### Navigation

- **Sidebar** (`ez-sidebar`): Glass bg, 260px width, disappears on mobile
- **Top Bar** (`ez-topbar`): 56px, sticky, glass effect
- **Bottom Tab** (`ez-bottom-tab`): Mobile only, 64px, safe area padding

### Form Inputs (`ez-input`)
- 6px border radius
- Focus: primary border + ring shadow
- Error: red border + red ring
- Disabled: 50% opacity

### Tables (`ez-table`)
- Sticky header with soft bg
- Row hover highlight
- Uppercase header labels (11px, 600 weight)
- Compact padding (8px vertical)

---

## 7. Layout Guidelines

### Dashboard
```
Desktop (>=1024px):
┌──────────┬────────────────────────┐
│  Sidebar │  Top Bar               │
│  260px   ├────────────────────────┤
│          │  Content (scrollable)  │
│          │  max-width: 1280px     │
└──────────┴────────────────────────┘

Mobile (<1024px):
┌────────────────────────────────────┐
│  Top Bar (56px)                    │
├────────────────────────────────────┤
│  Content (full width, scrollable)  │
├────────────────────────────────────┤
│  Bottom Tab (64px + safe area)     │
└────────────────────────────────────┘
```

### Pipeline Step Layout (BOQ → PO → Shop → Invoice → Receipt)
```
Desktop: horizontal pills with connectors
┌─────┐ ─── ┌─────┐ ─── ┌──────┐ ─── ┌─────────┐ ─── ┌─────────┐
│ BOQ │     │ PO  │     │ Shop │     │ Invoice │     │ Receipt │
└─────┘     └─────┘     └──────┘     └─────────┘     └─────────┘

Mobile: horizontal scroll, active step centered
```

### Responsive Breakpoints

| Name | Width | Usage |
|---|---|---|
| xs | 475px | Small phones |
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Sidebar appears |
| xl | 1280px | Full dashboard |
| 2xl | 1440px | Wide screens |

---

## 8. CSS Class Reference

| Class | Description |
|---|---|
| `ez-shell` | Max-width container with page padding |
| `ez-stack` | Flex column with section gap |
| `ez-dashboard` | Grid layout: sidebar + topbar + content |
| `ez-card` / `-elevated` / `-outlined` / `-filled` | Card variants |
| `ez-hero` | Large featured section |
| `ez-sidebar` / `ez-sidebar-item` | Side navigation |
| `ez-topbar` | Top navigation bar |
| `ez-bottom-tab` / `ez-bottom-tab-item` | Mobile tab bar |
| `ez-btn` + variant + size | Buttons |
| `ez-input` / `ez-label` | Form elements |
| `ez-table` | Styled data table |
| `ez-pipeline` / `ez-pipeline-step` | Pipeline flow |
| `ez-badge` + variant | Status badges |
| `ez-kicker` / `ez-title` / `ez-subtitle` | Typography |
| `ez-overline` / `ez-caption` | Small text |
| `ez-divider` | Horizontal rule |
| `ez-glass` | Frosted glass surface |
| `text-gold-gradient` | Gold gradient text |
| `zen-line` | Decorative accent line |
| `washi-texture` | Subtle paper texture bg |

---

## 9. Google Fonts Setup

Add to `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```
