import { useId } from "react";
import { attribute, band } from "../../shared/attributes.ts";
import { ordinal } from "../../shared/format.ts";
import { METRICS, POSITIONS, type MetricId, type PlayerProfile } from "../../shared/types.ts";

const STAR = "M7 0.8 L8.9 4.7 L13.2 5.3 L10.1 8.3 L10.8 12.6 L7 10.6 L3.2 12.6 L3.9 8.3 L0.8 5.3 L5.1 4.7 Z";

function StarRow({ fill, className }: { fill: number; className: string }) {
  const id = useId();
  const width = (fill / 5) * 80;
  return (
    <svg className={className} viewBox="0 0 80 14" aria-hidden>
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={width} height="14" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={STAR} transform={`translate(${i * 16.5} 0)`} />
        ))}
      </g>
    </svg>
  );
}

/** Ability (filled) over potential (ghost), in half stars. */
export function Stars({ current, potential, size = "sm" }: { current: number; potential?: number; size?: "sm" | "lg" }) {
  const label = `Ability ${current} of 5 stars${potential !== undefined && potential > current ? `, potential estimate ${potential}` : ""}`;
  return (
    <span className={`stars stars-${size}`} role="img" aria-label={label} title={label}>
      <StarRow fill={5} className="stars-track" />
      {potential !== undefined && potential > current && <StarRow fill={potential} className="stars-potential" />}
      <StarRow fill={current} className="stars-current" />
    </span>
  );
}

/** A 1-20 attribute, coloured on the ramp, with the percentile in its accessible name. */
export function Attr({ percentile, metric, player }: { percentile: number; metric?: MetricId; player?: PlayerProfile }) {
  const value = attribute(percentile);
  const title =
    metric && player
      ? `${METRICS[metric].label}: ${player.metrics[metric]}${METRICS[metric].unit}, ${ordinal(percentile)} percentile among ${POSITIONS[player.position].toLowerCase()}s`
      : `${ordinal(percentile)} percentile`;
  return (
    <span className={`attr attr-${band(value)}`} title={title} aria-label={`${value} out of 20 (${title})`}>
      {value}
    </span>
  );
}
