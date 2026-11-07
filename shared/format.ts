/** Shared by server templates and the UI. */
export const ordinal = (n: number): string => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
};

export const money = (m: number): string => `£${m % 1 === 0 ? m : m.toFixed(1)}m`;
