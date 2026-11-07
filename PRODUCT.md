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

- Every brief, profile and assistant answer is researched live on the web by the AI and cached per day. A brief takes roughly 30-90 seconds; progress streams to the screen.
- Market values are in € (Transfermarkt or, failing that, FootballTransfers/Sofascore). Any position including goalkeepers, any league.
- Claude interprets briefs, writes reports, runs the assistant and powers the landing demo; there is no non-AI fallback. Without an ANTHROPIC_API_KEY those routes answer 503.
- Scouts star favourites and arrange them on a tactic board (formations, drag to swap or reposition, fit per slot), saved in their browser.

## Capabilities and Constraints

- No adjustment for league strength in the stats yet.

## Evidence on Hand

- Claude's brief-reading score (`npm run eval`) is still to be measured; do not quote one before then.
- Player data is real and current, found per request by the AI with live web search (Transfermarkt, FBref, league and club sites, news); each fact carries its source URL, unknowns are null. Photos and badges come from TheSportsDB. No customers or testimonials.

## Product Principles

1. Show the AI's working: the interpreted brief is always visible and editable.
2. Every ranking explains itself with the metrics that drove it.
3. Claims are checked against data, and unsupported claims are flagged, not hidden.
4. Speak football, not data science: plain labels, with percentiles explained once.

## Accessibility & Inclusion

Radar comparisons need a text or bar equivalent. Colour is never the only signal.
