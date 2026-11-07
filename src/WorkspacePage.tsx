"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import type { AiSource } from "../shared/types.ts";
import { useAuth } from "./auth/AuthProvider.tsx";
import { SearchView } from "./SearchView.tsx";
import { UnderTheHood } from "./UnderTheHood.tsx";
import { AppShell } from "./ui/index.ts";

type View = "scout" | "hood";
const TABS = [
  { value: "scout" as const, label: "Scouting" },
  { value: "hood" as const, label: "Under the hood" },
];

/** The signed-in scouting workspace at /app. */
export function WorkspacePage() {
  const [view, setView] = useState<View>("scout");
  // Undefined = the server's default (Claude when a key is configured).
  const [engine, setEngine] = useState<AiSource>();
  const { session, signOut } = useAuth();

  const account = session ? (
    <div className="account">
      <span className="account-email" title={session.user.email}>
        {session.user.email}
      </span>
      <button className="account-out" onClick={() => void signOut()}>
        <LogOut aria-hidden /> Sign out
      </button>
    </div>
  ) : null;

  return (
    <AppShell
      title="Scout Copilot"
      tagline="Recruitment centre"
      tabs={TABS}
      activeTab={view}
      onTabChange={setView}
      keywordsChosen={engine === "offline"}
      account={account}
    >
      {/* Keep the workspace mounted so a brief and chat survive a look under the hood. */}
      <div hidden={view !== "scout"} className="view">
        <SearchView engine={engine} onEngineChange={setEngine} />
      </div>
      {view === "hood" && <UnderTheHood />}
    </AppShell>
  );
}
