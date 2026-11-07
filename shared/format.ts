/** Shared by the server and the UI. */
export const eur = (m: number | null | undefined): string =>
  m === null || m === undefined ? "–" : m >= 1 ? `€${m % 1 === 0 ? m : m.toFixed(1)}m` : `€${Math.round(m * 1000)}k`;

export const dash = (v: string | number | null | undefined): string => (v === null || v === undefined || v === "" ? "–" : String(v));
