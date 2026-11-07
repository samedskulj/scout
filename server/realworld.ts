import type { PlayerMedia, RealClub, RealPlayer } from "../shared/types.ts";

/**
 * Real-world football facts from TheSportsDB (https://www.thesportsdb.com), a free public API:
 * player photos, current club, nationality, position, and club badges. It has no performance data,
 * so it never feeds rankings; the assistant uses it to show who a real player is and where he plays.
 *
 * The shared test key "123" works without sign-up and is rate-limited. Set THESPORTSDB_KEY for a Patreon key.
 */
const BASE = "https://www.thesportsdb.com/api/v1/json";
const SOURCE = "TheSportsDB";
const TTL_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 6000;

const key = () => process.env.THESPORTSDB_KEY || "123";

const cache = new Map<string, { at: number; value: unknown }>();

async function get<T>(path: string): Promise<T | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  try {
    const res = await fetch(`${BASE}/${key()}/${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const value = (await res.json()) as T;
    cache.set(path, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

/** TheSportsDB returns "" and null interchangeably. */
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

type Row = Record<string, unknown>;

function toClub(t: Row): RealClub {
  return {
    kind: "club",
    id: String(t.idTeam),
    name: String(t.strTeam),
    league: str(t.strLeague),
    country: str(t.strCountry),
    stadium: str(t.strStadium),
    founded: Number(t.intFormedYear) || null,
    badge: str(t.strBadge),
    colours: [t.strColour1, t.strColour2].map(str).filter((c): c is string => Boolean(c)),
    source: SOURCE,
  };
}

async function clubById(id: unknown): Promise<RealClub | null> {
  if (!str(id)) return null;
  const data = await get<{ teams: Row[] | null }>(`lookupteam.php?id=${encodeURIComponent(String(id))}`);
  const t = data?.teams?.[0];
  return t ? toClub(t) : null;
}

/** Search real footballers by name. Returns up to `limit` matches, best first, each with club badge. */
export async function findRealPlayers(name: string, limit = 3): Promise<RealPlayer[] | null> {
  const data = await get<{ player: Row[] | null }>(`searchplayers.php?p=${encodeURIComponent(name.trim())}`);
  if (!data) return null; // API unreachable
  const rows = (data.player ?? []).filter((p) => p.strSport === "Soccer").slice(0, limit);
  return Promise.all(
    rows.map(async (p): Promise<RealPlayer> => {
      // The search result is slim; the lookup adds height and shirt number.
      const full = (await get<{ players: Row[] | null }>(`lookupplayer.php?id=${p.idPlayer}`))?.players?.[0] ?? p;
      const club = await clubById(p.idTeam);
      return {
        kind: "player",
        id: String(p.idPlayer),
        name: String(p.strPlayer),
        club: str(p.strTeam),
        nationality: str(p.strNationality),
        position: str(p.strPosition),
        born: str(p.dateBorn),
        height: str(full.strHeight),
        number: str(full.strNumber),
        photo: str(p.strThumb),
        cutout: str(p.strCutout) ?? str(full.strRender),
        clubBadge: club?.badge ?? null,
        source: SOURCE,
      };
    }),
  );
}

/** Search real clubs by name. */
export async function findRealClubs(name: string, limit = 2): Promise<RealClub[] | null> {
  const data = await get<{ teams: Row[] | null }>(`searchteams.php?t=${encodeURIComponent(name.trim())}`);
  if (!data) return null;
  return (data.teams ?? []).filter((t) => t.strSport === "Soccer").slice(0, limit).map(toClub);
}

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc|ac|club|de|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Photo, cutout and club badge for a real player, best effort. When the club is known, a search hit at a
 * different club is ignored, so a namesake's photo never lands on the wrong player.
 */
export async function findPlayerMedia(name: string, club: string | null): Promise<PlayerMedia> {
  const none: PlayerMedia = { photo: null, cutout: null, clubBadge: null };
  const data = await get<{ player: Row[] | null }>(`searchplayers.php?p=${encodeURIComponent(name.trim())}`);
  const rows = (data?.player ?? []).filter((p) => p.strSport === "Soccer");
  const wanted = club ? plain(club) : null;
  const row = wanted
    ? rows.find((p) => {
        const team = plain(String(p.strTeam ?? ""));
        return team && (team.includes(wanted) || wanted.includes(team));
      })
    : rows.length === 1
      ? rows[0]
      : undefined;
  if (!row) return none;
  const badge = (await clubById(row.idTeam))?.badge ?? null;
  return { photo: str(row.strThumb), cutout: str(row.strCutout), clubBadge: badge };
}
