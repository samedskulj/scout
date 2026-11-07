/** The mark: a pitch's centre circle and halfway line on the brand square. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="7" fill="var(--brand)" />
      <path d="M14 4.5 V23.5" stroke="var(--brand-ink)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="14" r="5.2" fill="none" stroke="var(--brand-ink)" strokeWidth="2" />
      <circle cx="14" cy="14" r="1.6" fill="var(--brand-ink)" />
    </svg>
  );
}
