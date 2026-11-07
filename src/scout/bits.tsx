import { ExternalLink, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import type { ScoutPlayer, Source } from "../../shared/types.ts";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const surname = (name: string) => name.split(/\s+/).at(-1) ?? name;

/** A player's photo from TheSportsDB, falling back to initials when there is none or it fails to load. */
export function Avatar({
  player,
  size = 36,
  prefer = "photo",
  className = "",
}: {
  player: Pick<ScoutPlayer, "name" | "photo" | "cutout">;
  size?: number;
  prefer?: "photo" | "cutout";
  className?: string;
}) {
  const src = prefer === "cutout" ? (player.cutout ?? player.photo) : (player.photo ?? player.cutout);
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  if (!src || failed)
    return (
      <span className={`avatar is-fallback ${className}`} style={style} aria-hidden>
        {initials(player.name)}
      </span>
    );
  // Remote images from TheSportsDB's CDN; next/image would need the host allow-listed and adds nothing here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`avatar ${className}`} style={style} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

/** Club badge, or nothing. */
export function ClubBadge({ src, size = 16 }: { src: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="club-badge" src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export const fitTone = (fit: number) => (fit >= 85 ? "good" : fit >= 70 ? "fair" : "poor");

export function FitScore({ fit, label = "Fit" }: { fit: number; label?: string }) {
  return (
    <span className={`fit-score fit-${fitTone(fit)}`} title={`${label}: ${fit} out of 100, the AI's judgement against the brief`}>
      {fit}
    </span>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function SourceList({ sources, compact = false }: { sources: Source[]; compact?: boolean }) {
  if (!sources.length) return null;
  return (
    <ul className={`sources${compact ? " is-compact" : ""}`} aria-label="Sources">
      {sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noreferrer noopener" title={s.url}>
            <ExternalLink aria-hidden />
            <span>{compact ? hostOf(s.url) : s.title || hostOf(s.url)}</span>
            {!compact && <small>{hostOf(s.url)}</small>}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Live view of a running web search: the searches so far and a running clock. */
export function SearchLog({ lines, title }: { lines: string[]; title: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="search-log" role="status" aria-live="polite">
      <p className="search-log-head">
        <Globe aria-hidden className="spin-slow" />
        <b>{title}</b>
        <span className="faint">{seconds}s</span>
      </p>
      <ol>
        {lines.slice(-6).map((l, i) => (
          <li key={`${i}-${l}`}>{l}</li>
        ))}
        {!lines.length && <li className="faint">Starting the search…</li>}
      </ol>
      <p className="faint small">Live web research usually takes 30–90 seconds. Searches you've run today come back instantly.</p>
    </div>
  );
}
