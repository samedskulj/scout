"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth/AuthProvider.tsx";
import { useFavourites } from "./scout/favourites.ts";
import { FavouritesBoard } from "./scout/FavouritesBoard.tsx";
import { SearchView } from "./SearchView.tsx";
import { AppShell } from "./ui/index.ts";

type View = "scout" | "favourites";

/** The signed-in scouting workspace at /app. */
export function WorkspacePage() {
  const [view, setView] = useState<View>("scout");
  const { session, signOut } = useAuth();
  const favourites = useFavourites(session?.user.id);

  const tabs = [
    { value: "scout" as const, label: "Scouting" },
    { value: "favourites" as const, label: favourites.players.length ? `Favourites · ${favourites.players.length}` : "Favourites" },
  ];

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
    <AppShell title="Scout Copilot" tagline="Recruitment centre" tabs={tabs} activeTab={view} onTabChange={setView} account={account}>
      {/* Keep the workspace mounted so a brief and chat survive a visit to the board. */}
      <div hidden={view !== "scout"} className="view">
        <SearchView favourites={favourites} />
      </div>
      {view === "favourites" && <FavouritesBoard favourites={favourites} onGoScouting={() => setView("scout")} />}
    </AppShell>
  );
}
