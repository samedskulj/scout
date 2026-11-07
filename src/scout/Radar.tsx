export interface RadarSeries {
  name: string;
  values: number[]; // 0-100, one per axis
}

const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = 112;

function point(i: number, n: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CENTER + RADIUS * (value / 100) * Math.cos(angle), CENTER + RADIUS * (value / 100) * Math.sin(angle)];
}

const polygon = (values: number[]) => values.map((v, i) => point(i, values.length, v).join(",")).join(" ");

/** Percentile radar for up to two players. */
export function Radar({ axes, series }: { axes: string[]; series: RadarSeries[] }) {
  const n = axes.length;
  return (
    <figure className="radar">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Percentile radar: ${series.map((s) => s.name).join(" vs ")}`}>
        {[25, 50, 75, 100].map((ring) => (
          <polygon key={ring} points={polygon(Array(n).fill(ring))} className="radar-ring" />
        ))}
        {axes.map((label, i) => {
          const [x, y] = point(i, n, 100);
          const [lx, ly] = point(i, n, 122);
          const anchor = Math.abs(lx - CENTER) < 8 ? "middle" : lx > CENTER ? "start" : "end";
          return (
            <g key={label}>
              <line x1={CENTER} y1={CENTER} x2={x} y2={y} className="radar-axis" />
              <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" className="radar-label">
                {label}
              </text>
            </g>
          );
        })}
        {series.map((s, i) => (
          <polygon key={s.name} points={polygon(s.values)} className={`radar-series radar-series-${i}`} />
        ))}
      </svg>
      <figcaption className="row">
        {series.map((s, i) => (
          <span key={s.name} className="legend">
            <span className={`swatch radar-series-${i}`} />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
