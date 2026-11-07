import type { Metadata } from "next";
import { LandingPage } from "@/marketing/LandingPage";

export const metadata: Metadata = {
  title: { absolute: "Scout Copilot · From the coach's brief to a shortlist you can defend" },
};

export default function Home() {
  return <LandingPage />;
}
