---
name: Scout Copilot
description: Plain-English player scouting where the AI reads the brief and the code ranks and checks; graphite product UI with one indigo accent.
colors:
  ground: "#0a0b0e"
  panel: "#111317"
  panel-2: "#171a1f"
  panel-3: "#1e2228"
  line: "#24282f"
  line-strong: "#31363e"
  text: "#f3f4f6"
  muted: "#a4aab4"
  faint: "#868c97"
  chrome: "#0e1013"
  chrome-line: "#24282f"
  chrome-ink: "#c9ced6"
  accent: "#7c86ff"
  accent-strong: "#959dff"
  accent-soft: "rgb(124 134 255 / 0.14)"
  accent-ink: "#0a0b0e"
  primary: "#f3f4f6"
  primary-hover: "#ffffff"
  primary-ink: "#0a0b0e"
  attr-poor: "#8792a8"
  attr-fair: "#dcbc86"
  attr-good: "#5fc285"
  attr-excellent: "#cde65a"
  attr-poor-bg: "rgb(135 146 168 / 0.12)"
  attr-fair-bg: "rgb(220 188 134 / 0.13)"
  attr-good-bg: "rgb(95 194 133 / 0.14)"
  attr-excellent-bg: "rgb(205 230 90 / 0.15)"
  good: "#5fc285"
  good-soft: "rgb(95 194 133 / 0.14)"
  warn: "#e9b35a"
  warn-soft: "rgb(233 179 90 / 0.14)"
  bad: "#f08a7a"
  bad-soft: "rgb(240 138 122 / 0.14)"
  info: "#67c7e0"
  info-soft: "rgb(103 199 224 / 0.12)"
  pitch-a: "#15322a"
  pitch-b: "#183830"
  chalk: "rgb(243 244 246 / 0.5)"
typography:
  display:
    fontFamily: "Cabinet Grotesk, Satoshi, system-ui, sans-serif"
    fontSize: "clamp(42px, 6.2vw, 76px)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Cabinet Grotesk, Satoshi, system-ui, sans-serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Cabinet Grotesk, Satoshi, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "Satoshi, system-ui, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Satoshi, system-ui, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  body-lead:
    fontFamily: "Satoshi, system-ui, Segoe UI, sans-serif"
    fontSize: "17.5px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Satoshi, system-ui, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.04em"
  button:
    fontFamily: "Satoshi, system-ui, Segoe UI, sans-serif"
    fontSize: "13.5px"
    fontWeight: 550
    lineHeight: 1.1
  numeral:
    fontFamily: "Barlow Condensed, Satoshi, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  mono:
    fontFamily: "Geist Mono, ui-monospace, Cascadia Code, Consolas, monospace"
    fontSize: "12px"
rounded:
  xs: "4px"
  chip: "5px"
  sm: "6px"
  md: "8px"
  field-public: "10px"
  card-public: "16px"
  panel-public: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  card: "14px"
  lg: "16px"
  xl: "20px"
  gutter: "32px"
  block: "64px"
  section: "140px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.panel-3}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-ghost-hover:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
  button-pill-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.pill}"
    height: "38px"
    padding: "0 16px"
  button-pill-primary-lg:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.pill}"
    height: "46px"
    padding: "0 22px"
  button-pill-secondary:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    height: "38px"
    padding: "0 16px"
  send-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    size: "38px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  input-public:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.field-public}"
    height: "44px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "14px"
  card-public:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.card-public}"
    padding: "28px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  tab-active:
    backgroundColor: "{colors.panel-3}"
    textColor: "{colors.text}"
  badge-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  chip:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.chip}"
    padding: "3px 6px 3px 9px"
  attr-excellent:
    backgroundColor: "{colors.attr-excellent-bg}"
    textColor: "{colors.attr-excellent}"
    typography: "{typography.numeral}"
    rounded: "{rounded.chip}"
    height: "22px"
  attr-good:
    backgroundColor: "{colors.attr-good-bg}"
    textColor: "{colors.attr-good}"
    typography: "{typography.numeral}"
    rounded: "{rounded.chip}"
    height: "22px"
  attr-fair:
    backgroundColor: "{colors.attr-fair-bg}"
    textColor: "{colors.attr-fair}"
    typography: "{typography.numeral}"
    rounded: "{rounded.chip}"
    height: "22px"
  attr-poor:
    backgroundColor: "{colors.attr-poor-bg}"
    textColor: "{colors.attr-poor}"
    typography: "{typography.numeral}"
    rounded: "{rounded.chip}"
    height: "22px"
  shortlist-row-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
---

# Design System: Scout Copilot

## Overview

**Creative North Star: "The Open Scouting Console"**

Scout Copilot follows the modern product-site conventions of the Linear and Vercel class, chosen by the user on 2026-11-07 in place of the earlier claret, amber and navy club-office world. Surfaces are graphite and step lighter as they come forward. Hairline borders separate them. One indigo accent marks the brand, focus, selection and the selected player. Primary actions are white on graphite. The only other strong colour belongs to the data: a four-band ramp for 1–20 attributes, always printed beside the number.

The app at `/app` is a dense desk tool: a full-width brief bar, then three panes (Claude's read and the assistant, the ranked shortlist, the player profile). It uses tight 6–8px corners, 13–15px Satoshi, and condensed numerals in every rating cell. The public site uses the same palette but more space and a display face: pill buttons, 16–24px cards, large Cabinet Grotesk headlines, faint indigo radial glows, and the real product UI (a live demo in a window frame) as its only imagery.

Football-manager vocabulary carries the domain. Players read as attribute sheets with ability stars, a pitch shows positions, and Barlow Condensed is kept only for those numerals.

**Key Characteristics:**
- Graphite neutrals in four tonal steps (ground, panel, panel-2, panel-3) with two hairline weights.
- A single indigo accent, plus a strong variant for text-on-dark and a 14% soft tint for fills.
- White primary buttons; indigo is never the main call-to-action fill except the chat send button.
- A four-band attribute ramp (slate, sand, green, lime) kept apart from the status colours.
- Satoshi for UI and body text, Cabinet Grotesk for display headlines, Barlow Condensed only for rating numerals and stat figures.
- Flat in the app, with soft long shadows and indigo glows only on the public site.

## Colors

Graphite neutrals, one indigo voice, white actions, and a separate colour vocabulary for data and status.

### Primary
- **Signal Indigo** (accent): the brand square, focus rings, text selection, caret, the selected shortlist row's rank and name, the selected pitch counter, the selected fit bar, the first radar series stroke, and numbered step counters in the app.
- **Bright Indigo** (accent-strong): indigo used as text or an icon on the public site: inline links, arrow links, check icons, flags, step numbers. It is lighter than Signal Indigo so it stays legible at small sizes on graphite.
- **Indigo Wash** (accent-soft): the fill behind selected rows, accent badges, demo chips, step tiles and plan flags. It also forms the 3px focus halo around inputs.
- **Graphite Ink** (accent-ink): the dark marks drawn on indigo (the brand mark's centre circle and halfway line, selected counter labels, the send icon) and the text colour for selected text.

### Neutral
- **Night Ground** (ground): the page, input wells, sticky table headers, the assistant's reply bubbles.
- **Graphite Panel** (panel): cards, the brief bar, the AI and profile panes, public-site cards.
- **Raised Graphite** (panel-2): hover fills, chips, secondary buttons, list rows.
- **Top Graphite** (panel-3): active tabs and segments, the user's chat bubble, star tracks, position codes.
- **Hairline** (line) and **Strong Hairline** (line-strong): dividers and card borders; line-strong for controls, fields, dashed empty states and hovered borders.
- **Paper White** (text), **Ash** (muted), **Smoke** (faint): primary text, secondary text, and labels, placeholders and table headers.
- **Header Graphite** (chrome, chrome-line, chrome-ink): the app masthead only.
- **White Action** (primary, primary-hover, primary-ink): primary buttons on both surfaces. Hover goes to pure white.

### Data and Status
- **Attribute ramp** (attr-poor slate 1–5, attr-fair sand 6–10, attr-good green 11–15, attr-excellent lime 16–20, each with a 12–15% tint): band thresholds come from `shared/attributes.ts`. They colour only 1–20 rating cells.
- **Status** (good, warn, bad, info, each with a soft tint): badges, report claim checks, risks, errors, the parked-brief notice. Info also marks the comparison player: the second radar series and the active similar-player row.
- **Pitch** (pitch-a, pitch-b, chalk): the two turf stripes and line markings of the position pitch.

### Named Rules
**The One Voice Rule.** Indigo is the only hue that means "brand", "you are here" or "selected". Do not add a second accent.

**The White Action Rule.** The main action on any screen is a white button with graphite text. Indigo marks state, not the next step.

**The Number First Rule.** An attribute colour never appears without its 1–20 number printed in it. The ramp is a second signal and is not used outside rating cells.

## Typography

**Display Font:** Cabinet Grotesk 500/700/800 (Fontshare), with Satoshi as fallback
**Body Font:** Satoshi, variable 300–900 (Fontshare)
**Numeral Font:** Barlow Condensed 500/600/700 (next/font), with Satoshi as fallback
**Mono:** Geist Mono (next/font), with ui-monospace, Cascadia Code, Consolas

Fontshare fonts load from `api.fontshare.com` in `src/app/layout.tsx`; the family stacks live in `--font-sans`, `--font-heading`, `--font-cond` and `--font-mono` in `src/app/globals.css` (Tailwind: `font-sans`, `font-heading`, `font-cond`, `font-mono`).

**Character:** Satoshi is a clean, slightly geometric sans that stays legible at the app's 13–15px; its variable axis allows the intermediate weights (550, 650). Cabinet Grotesk gives the public site's headlines a sporty, confident voice at 700–800, tracked tight. The app does not use it. The condensed face appears only where the football-manager reading happens: attribute numbers, fit scores, ranks, position codes and stat figures.

### Hierarchy
- **Display** (Cabinet Grotesk 800, 48–80px, 1.02–1.04, tight): public-site hero headline, pricing and closing-panel headlines (the closing panel is 36–60px).
- **Headline** (Cabinet Grotesk 700, 36–48px, tight): public-site section headlines and plan prices.
- **Title** (650, 24px, 1.1, -0.02em): player name in the profile. Report headlines, board intros and demo names use the same style at 18–22px.
- **Small title** (600, 15px, 1.3): board title, app brand name, Under-the-hood section heads.
- **Body** (400, 14px, 1.45, tabular numerals): all app text. Public-site paragraphs run 15–18px at 1.55–1.6, with a 58–68ch measure.
- **Label** (600, 11–12px, 0.04–0.05em, uppercase, faint or muted): app pane section heads, table headers, the brief label, and demo-panel step heads. These label the panel or column they head.
- **Numeral** (Barlow Condensed 700, 15px for attributes, 18–22px for fit scores, tabular): ratings and figures only.

### Named Rules
**The Condensed Is For Numbers Rule.** Barlow Condensed sets numerals, ranks, position codes and stat lines. It never sets headings or body copy.

## Layout

The app fills the viewport: a 52px masthead, then a brief bar (44px input and run button with example chips), then three panes at 320px, flexible, and 400–430px, each scrolling independently. Below 1280px the AI pane spans two rows beside the board and the profile drops under it. Below 860px everything stacks in one column, the masthead tabs wrap to a full-width row, and the drivers column moves inline. Inside panes the spacing runs 4/8/12/14/16/20px, with card padding at 14px and pane padding at 14–18px.

The public site uses a 1200px container with 32px gutters (16px under 760px), a 60px sticky translucent nav, a 96px hero top, and 140px between sections (96px on mobile). Grids are three-column bentos, four-step rows and three plan cards with 16px gaps, plus two-column trust and FAQ splits with 64px gaps. These collapse at 1080px and 760px.

## Elevation & Depth

The app is flat. Depth comes from the four graphite steps and hairline borders. The only shadows are a 1px drop under the active segmented button and an inset 1px ring on the leading value in a comparison. The public site adds atmosphere: soft long drop shadows under the product window, highlighted plan and login card, and indigo radial glows behind the hero, the closing panel and the login showcase.

### Shadow Vocabulary
- **Segment lift** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.4)`): the active segment in a segmented control.
- **Window float** (`box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4), 0 40px 80px -20px rgb(0 0 0 / 0.7), 0 0 120px -40px rgb(124 134 255 / 0.35)`): the product window on the landing page.
- **Showcase card** (`box-shadow: 0 40px 80px -30px rgb(0 0 0 / 0.7)`): the floating sample card on the login page.
- **Plan glow** (`box-shadow: 0 40px 80px -40px rgb(124 134 255 / 0.45)`): the highlighted pricing plan.

### Named Rules
**The Flat Desk Rule.** App surfaces separate by tone and hairline, not shadow. Long shadows and glows belong to the public site.

## Shapes

Corners are soft and small in the app: 8px for cards, fields, notices and the send button; 6px for buttons, tabs and segmented controls; 5px for chips, rating cells, example prompts and list rows; 4px for chat bubbles and position codes. Badges are full pills. The public site is rounder: 10px fields and demo rows, 12–16px cards, 18px plans, a 24px closing panel, and 999px pills for buttons, nav links and flags. The brand mark is a 7px-radius indigo square with a pitch's halfway line and centre circle drawn in graphite. Borders are always 1px hairlines; empty states use a dashed line-strong border.

## Components

### Buttons
Quiet, compact and white-led.
- **Shape:** 6px in the app; full pill on the public site (38px tall, 46px large).
- **Primary:** white fill, graphite text, weight 550. In the app padding is 8px 14px; the brief bar's run button is 44px tall.
- **Hover / Focus:** primary goes to pure white, secondary to panel-3, ghost to a panel-2 fill with full-white text. All use 150–160ms ease-out colour transitions. Public pills press down 1px on active and nudge their arrow icon 2px right. Focus is the global 2px indigo outline at 2px offset.
- **Secondary / Ghost:** secondary is panel-2 with a line-strong border; ghost is transparent with muted text. Disabled controls drop to 50% opacity.
- **Send:** the chat send button is the one indigo-filled button, a 38px square at 8px radius.

### Chips
- **Style:** filter chips use panel-2 fill, a line-strong border, a 5px radius and 12.5px text. Example prompts are outlined and transparent.
- **State:** hovering a removable chip turns its border and remove icon to the bad colour. Demo read-out chips are indigo-wash pills.

### Cards / Containers
- **Corner Style:** 8px (app), 16px (public).
- **Background:** panel. Public tiles use a panel-2-to-panel vertical gradient; highlighted plans use an indigo-wash gradient with a 55%-opacity indigo border.
- **Shadow Strategy:** none in the app; see Elevation for the public site.
- **Border:** 1px line, moving to line-strong on hover.
- **Internal Padding:** 14px (app), 24–32px (public).

### Inputs / Fields
- **Style:** ground fill, 1px line-strong border, 8px radius, 8px 10px padding, indigo caret. Public login fields are 44px tall on panel with a 10px radius.
- **Focus:** the border turns indigo and gains a 3px indigo-wash halo; the outline is removed.
- **Error:** a bad-soft notice block in bad text, 8px radius.

### Navigation
- **App masthead:** chrome background with a hairline bottom border, the brand mark and name, and text tabs (500, 13.5px, muted). Hover gives a panel-2 fill; the active tab is panel-3 with white text.
- **Public nav:** sticky, 72%-opacity ground with a 14px backdrop blur. Pill links in muted text gain a panel-2 fill on hover or when active. Under 760px it becomes a toggle that opens a stacked menu.

### Attribute Cell (signature)
A 1–20 value in Barlow Condensed 700 at 15px, in a 22px-tall cell at least 26px wide with a 5px radius, coloured by band: ramp text over its tint. It appears in the attribute sheet (four groups, with the per-90 value and percentile beside each), the shortlist's driver column, comparisons (the leader gets an inset ring) and the public demo. Ability stars sit alongside: a white current-ability fill over a dimmer potential fill on a panel-3 track.

### Shortlist Table
Uppercase faint headers on a sticky ground background. Rows have 7px 8px cells with hairline separators, faint zebra striping and a panel-2 hover. The selected row takes the indigo wash, and its rank, name and fit bar turn indigo. When results change, rows settle in with a 260ms staggered rise.

## Do's and Don'ts

### Do:
- **Do** take every colour from the tokens: design tokens in `:root` of `src/ui/styles.css` (in CSS the indigo family is `--brand`, `--brand-strong`, `--brand-soft`, `--brand-ink`, and muted text is `--text-muted`), mapped to shadcn/ui and Tailwind in `src/app/globals.css` (`bg-brand-soft`, `text-brand-strong`, `bg-panel-2`, `text-faint`, `text-good`…). shadcn's own `--accent` is the hover surface, not indigo. If a translucent tint is needed, add a token next to its parent colour.
- **Do** build public-site UI from shadcn/ui components (`src/components/ui`) and Tailwind utilities; the dense workspace keeps its hand-written CSS in `src/ui/styles.css` and `src/scout.css`.
- **Do** keep indigo for brand, focus, selection and the selected player. Use accent-strong when indigo is small text or an icon on the public site.
- **Do** print the 1–20 number in every attribute cell and colour it with the ramp from `shared/attributes.ts` (1–5, 6–10, 11–15, 16–20).
- **Do** use 6px buttons and 8px cards and fields in the app, and pills with 10–24px cards on the public site.
- **Do** separate app surfaces by graphite step and 1px hairline.
- **Do** show the real product UI as the public site's imagery.

### Don't:
- **Don't** add a second accent hue or use status colours as decoration.
- **Don't** fill primary call-to-action buttons with indigo; they are white (the chat send button is the one exception).
- **Don't** use the attribute ramp for status, or status colours for ratings.
- **Don't** set headings or prose in Barlow Condensed.
- **Don't** bring the retired claret, amber or navy values back.
