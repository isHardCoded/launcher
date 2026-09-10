import { useState } from "react";
import { GamesList } from "./components/blocks/games-list";
import { Header } from "./components/blocks/header";
import { ProfilePage } from "./components/blocks/profile";
import { useHashRoute } from "./hooks/use-hash-route";
import { INITIAL_FILTERS, type GamesFilters } from "./types/filters";

export function App() {
  const route = useHashRoute();
  // Единственный источник правды о том, как настроена витрина.
  const [filters, setFilters] = useState<GamesFilters>(INITIAL_FILTERS);

  if (route === "profile") {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header route={route} />

        <main className="p-6">
          <ProfilePage />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header
        route={route}
        search={filters.search}
        onSearchChange={(search) => setFilters({ ...filters, search })}
      />

      <main className="p-6">
        <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">
          FEATURED & RECOMMENDED
        </h2>

        <GamesList filters={filters} onFiltersChange={setFilters} />
      </main>
    </div>
  );
}
