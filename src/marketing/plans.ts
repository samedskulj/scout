/**
 * Plans and prices for the pricing page and the landing page's pricing preview.
 * EDIT HERE: the prices below are placeholders. Set PRICES_ARE_PLACEHOLDERS to false once they're real,
 * which removes the "sample prices" notice from both pages.
 */
export const PRICES_ARE_PLACEHOLDERS = true;

/** Where "Talk to us" buttons go. Leave empty to send people to account sign-up instead. */
export const SALES_EMAIL = "";

export interface Plan {
  id: "scout" | "club" | "enterprise";
  name: string;
  for: string;
  price: string;
  unit: string;
  cta: { label: string; to: "signup" | "contact" };
  highlight?: string;
  includes: string[];
}

export const PLANS: Plan[] = [
  {
    id: "scout",
    name: "Scout",
    for: "One scout or analyst working their own briefs.",
    price: "£49",
    unit: "per scout / month",
    cta: { label: "Get started", to: "signup" },
    includes: [
      "Briefs in plain English, read by Claude",
      "Ranked shortlists that show why",
      "1–20 attribute sheets and radar comparisons",
      "Scouting reports with every claim checked",
      "The scout assistant",
    ],
  },
  {
    id: "club",
    name: "Club",
    for: "A recruitment department working from the same shortlists.",
    price: "£390",
    unit: "per month, up to 10 scouts",
    cta: { label: "Get started", to: "signup" },
    highlight: "For most departments",
    includes: ["Everything in Scout", "Up to 10 scout accounts", "Onboarding session with your recruitment team", "Priority email support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    for: "Clubs and groups with their own data and procurement.",
    price: "Custom",
    unit: "annual contract",
    cta: { label: "Talk to us", to: "contact" },
    includes: ["Everything in Club", "Unlimited scout accounts", "Help connecting your own data provider", "Invoicing and contract terms"],
  },
];

/** Feature-by-plan table on the pricing page. */
export const COMPARISON: { feature: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { feature: "Scout accounts", values: ["1", "Up to 10", "Unlimited"] },
  { feature: "Plain-English briefs (Claude)", values: [true, true, true] },
  { feature: "Explainable ranked shortlists", values: [true, true, true] },
  { feature: "1–20 attribute sheets, ability stars", values: [true, true, true] },
  { feature: "Radar comparisons with similar and cheaper players", values: [true, true, true] },
  { feature: "Scouting reports with claim checks", values: [true, true, true] },
  { feature: "Scout assistant chat", values: [true, true, true] },
  { feature: "Onboarding session", values: [false, true, true] },
  { feature: "Help connecting your data provider", values: [false, false, true] },
  { feature: "Support", values: ["Email", "Priority email", "Named contact"] },
];
