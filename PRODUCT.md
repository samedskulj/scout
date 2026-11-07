# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a club recruitment scout or analyst. They turn a coach's or director's brief ("left-footed centre-back under 24, comfortable on the ball, max £30m") into a shortlist, compare players and write up a report.

Current audience: a hiring panel (SoundSense AI) watching a recorded demo of up to 10 minutes. The flow must explain itself on screen without narration.

## Product Purpose

Search a player database in plain English. The AI turns the brief into visible, editable filters and ranking priorities. A deterministic ranking produces an explainable shortlist. Each player can be compared on percentile radars against similar or cheaper profiles. An AI scouting report is generated whose claims are checked against the data. A scout assistant (Claude with tool use) answers follow-ups in chat by running the same search, profile and comparison code, lists each lookup it made, and puts its picks on the board.

Players read like a football management game: each metric is shown as a 1–20 attribute (percentile / 5, rounded up) beside its per-90 value and percentile, with ability stars (mean key-metric percentile) and an age-based potential that is always labelled an estimate.

Success: from brief to a defensible shortlist and report in under a minute, and the scout can always see why a player ranks where they do.

## Positioning

The AI interprets and writes; code ranks and verifies. Rankings are weighted percentiles against same-position players, so there is no black-box score. Every report claim is checked: strengths must be at or above the 60th percentile, weaknesses at or below the 40th.

## Operating Context

- 300 fictional players across 8 leagues and 25 fictional clubs, generated with a fixed seed (`scripts/generate-players.ts`).
- 12 metrics per player, per 90 minutes or as percentages. Percentiles are against the same position.
- With an ANTHROPIC_API_KEY, Claude interprets briefs, writes reports and runs the assistant. Without one, or when Claude is unavailable and the scout switches engines, a keyword parser, a report template and a keyword-search assistant take over.
- A query-interpretation eval (`npm run eval`) scores 8 briefs.

## Capabilities and Constraints

- Outfield players only, no goalkeepers. Players with under 900 minutes are excluded from rankings.
- No adjustment for league strength in the stats yet.
- Market values are in £ millions and fictional.

## Evidence on Hand

- Offline keyword parser: 24/28 query checks. Claude score to be measured; do not quote it before then.
- All players and clubs are fictional; there are no real data feeds, customers or testimonials.

## Product Principles

1. Show the AI's working: the interpreted brief is always visible and editable.
2. Every ranking explains itself with the metrics that drove it.
3. Claims are checked against data, and unsupported claims are flagged, not hidden.
4. Speak football, not data science: plain labels, with percentiles explained once.

## Accessibility & Inclusion

Radar comparisons need a text or bar equivalent. Colour is never the only signal.
