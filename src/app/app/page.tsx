import type { Metadata } from "next";
import { RequireAuth } from "@/auth/AuthProvider";
import { WorkspacePage } from "@/WorkspacePage";

export const metadata: Metadata = { title: "Recruitment centre" };

/** The signed-in scouting workspace. */
export default function App() {
  return (
    <RequireAuth>
      <WorkspacePage />
    </RequireAuth>
  );
}
