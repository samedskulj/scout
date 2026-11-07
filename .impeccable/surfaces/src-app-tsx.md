---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Scout Copilot · scouting workspace

Scope: the single-page app (Scouting workspace + "Under the hood" view). Mode: Operate.
Audience: club recruitment scouts and analysts at desks, long sessions on large monitors; today, a hiring panel watching a recorded demo. Job: brief → defensible shortlist → player profile and comparison → checked report, with a Claude scout assistant alongside.
Constraints: fictional 300-player database; Claude when an API key works, keyword parser and template otherwise. Ratings are derived from percentiles (1–20 = percentile/5 rounded up); potential is an age-based estimate and is labelled so.
Unresolved: the Claude query-eval score is pending.

## Direction contract

THESIS: A management-game scouting centre that tells the truth. Every player reads as a 1–20 attribute sheet with ability stars, the way scouts already think from football management games, but every number opens to the real per-90 stat and percentile behind it. It refuses the black-box "match score" dashboard and the generic SaaS card grid.

OWN-WORLD: Modern product-site convention (Linear/Vercel class), chosen by the user on 2026-11-07. Graphite neutrals (#0a0b0e ground, stepped panels, hairline borders), one indigo accent (#7c86ff) for brand, links, focus and the selected player, white primary buttons, Inter for UI, Barlow Condensed kept only for numerals in ratings. A separate four-step data ramp for 1–20 attributes (slate, sand, green, lime-gold), always with the number printed.

STORY: The scout types a brief, sees how Claude read it (lit positions on a pitch, removable chips), scans a dense ranked table with stars and the attributes that drove each rank, opens a player into an attribute sheet, compares him on a radar with a text equivalent, generates a checked report, and asks the assistant follow-ups that re-shape the board.

FIRST VIEWPORT: Claret masthead (crest mark, name, Scouting / Under the hood tabs, engine status). A brief bar spans the width with examples. Three panes: left 320px "Claude's read" pitch + chips, and the Assistant chat beneath; centre the ranked shortlist table; right 440px the player profile (header with stars, tabs Attributes / Compare / Report).

FORM: user-pinned "Football Manager type" scouting interface; the user's pin overrode the hand dealt for this surface · seed: 7a831cc204aef50a
Signature move: the attribute sheet. 1–20 values on the ramp in four groups, with the per-90 value and percentile printed beside each, and the pitch shows the player's position with the amber counter.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
