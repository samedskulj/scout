import type { Metadata } from "next";
import { PricingPage } from "@/marketing/PricingPage";

export const metadata: Metadata = { title: "Pricing" };

export default function Pricing() {
  return <PricingPage />;
}
